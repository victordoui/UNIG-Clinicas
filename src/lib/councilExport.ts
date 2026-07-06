import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatBRL } from '@/lib/purchaseLabels';
import type {
  CouncilProposal, CouncilQuote, CouncilVote, CouncilMember,
} from '@/hooks/useCouncil';

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  em_votacao: 'Em votação',
  aprovada: 'Aprovada',
  reprovada: 'Reprovada',
  retirada: 'Retirada',
};
const VOTE_LABEL: Record<string, string> = {
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  abstencao: 'Abstenção',
};

function slugify(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
}

function fileBase(p: CouncilProposal) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `Conselho_${slugify(p.titulo.replace(/^\[DEMO\]\s*/, ''))}_${ymd}`;
}

async function urlToDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportCouncilProposalPDF(
  proposal: CouncilProposal,
  quotes: CouncilQuote[],
  votes: CouncilVote[],
  members: CouncilMember[],
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const titulo = proposal.titulo.replace(/^\[DEMO\]\s*/, '');

  // Header bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 60, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('UNIG Facilities', margin, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Proposta ao Conselho', margin, 46);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString('pt-BR'), pageW - margin, 28, { align: 'right' });

  let y = 80;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(titulo, pageW - margin * 2);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 22;

  // Meta
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const meta: string[] = [];
  meta.push(`Status: ${STATUS_LABEL[proposal.status] ?? proposal.status}`);
  if (proposal.location) meta.push(`Local: ${proposal.location}`);
  meta.push(`Criado em: ${new Date(proposal.created_at).toLocaleDateString('pt-BR')}`);
  if (proposal.decidido_em) meta.push(`Decidido em: ${new Date(proposal.decidido_em).toLocaleDateString('pt-BR')}`);
  doc.text(meta.join('  •  '), margin, y);
  y += 18;

  // Imagem
  if (proposal.imagem_url) {
    const data = await urlToDataURL(proposal.imagem_url);
    if (data) {
      try {
        const imgW = pageW - margin * 2;
        const imgH = imgW * 0.42;
        doc.addImage(data, 'JPEG', margin, y, imgW, imgH, undefined, 'FAST');
        y += imgH + 16;
      } catch { /* ignore */ }
    }
  }

  // Justificativa
  if (proposal.justificativa) {
    if (y > 700) { doc.addPage(); y = margin; }
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Justificativa', margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(proposal.justificativa, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 13 + 10;
  }

  // Cotações
  const sorted = [...quotes].sort((a, b) => Number(a.total) - Number(b.total));
  const bestId = sorted[0]?.id;
  if (y > 650) { doc.addPage(); y = margin; }
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Comparativo de cotações', margin, y);
  y += 8;

  autoTable(doc, {
    startY: y + 4,
    head: [['Fornecedor', 'Valor unit.', 'Qtd', 'Frete', 'Total', 'Condições']],
    body: quotes.map(q => [
      q.fornecedor,
      formatBRL(q.valor_unit),
      String(q.qtd),
      Number(q.frete) > 0 ? formatBRL(q.frete) : '—',
      formatBRL(q.total),
      q.condicoes ?? '—',
    ]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right' }, 2: { halign: 'right' },
      3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && quotes[data.row.index]?.id === bestId) {
        data.cell.styles.fillColor = [220, 252, 231];
        data.cell.styles.textColor = [6, 95, 70];
      }
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 20;

  // Votação
  if (y > 680) { doc.addPage(); y = margin; }
  const aprovados = votes.filter(v => v.voto === 'aprovado').length;
  const rejeitados = votes.filter(v => v.voto === 'rejeitado').length;
  const abstencoes = votes.filter(v => v.voto === 'abstencao').length;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Resultado da votação', margin, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(
    `Aprovações: ${aprovados} / ${proposal.min_votos_aprovacao} mínimo  •  Rejeições: ${rejeitados}  •  Abstenções: ${abstencoes}  •  Membros: ${proposal.total_membros}`,
    margin, y,
  );
  y += 16;

  const memberRows = members.map((m, i) => {
    const v = votes.find(x => x.membro_user_id === m.user_id);
    return [
      `M${i + 1}`,
      v ? VOTE_LABEL[v.voto] : 'Pendente',
      v?.comentario ?? '—',
      v?.votado_em ? new Date(v.votado_em).toLocaleString('pt-BR') : '—',
    ];
  });
  if (memberRows.length === 0) {
    for (let i = 0; i < proposal.total_membros; i++) {
      memberRows.push([`M${i + 1}`, 'Pendente', '—', '—']);
    }
  }

  autoTable(doc, {
    startY: y,
    head: [['Membro', 'Voto', 'Comentário', 'Votado em']],
    body: memberRows,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 14;
  if (y > 760) { doc.addPage(); y = margin; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const finalLabel = `Status final: ${STATUS_LABEL[proposal.status] ?? proposal.status}`;
  if (proposal.status === 'aprovada') doc.setTextColor(6, 95, 70);
  else if (proposal.status === 'reprovada') doc.setTextColor(153, 27, 27);
  else doc.setTextColor(15, 23, 42);
  doc.text(finalLabel, margin, y);

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')}  •  Página ${i} de ${pageCount}`,
      pageW / 2, doc.internal.pageSize.getHeight() - 18, { align: 'center' },
    );
  }

  doc.save(`${fileBase(proposal)}.pdf`);
}

export function exportCouncilProposalExcel(
  proposal: CouncilProposal,
  quotes: CouncilQuote[],
  votes: CouncilVote[],
  members: CouncilMember[],
) {
  const titulo = proposal.titulo.replace(/^\[DEMO\]\s*/, '');
  const wb = XLSX.utils.book_new();

  const propSheet = XLSX.utils.json_to_sheet([
    { Campo: 'Título', Valor: titulo },
    { Campo: 'Local', Valor: proposal.location ?? '' },
    { Campo: 'Status', Valor: STATUS_LABEL[proposal.status] ?? proposal.status },
    { Campo: 'Justificativa', Valor: proposal.justificativa ?? '' },
    { Campo: 'Criado em', Valor: new Date(proposal.created_at).toLocaleString('pt-BR') },
    { Campo: 'Decidido em', Valor: proposal.decidido_em ? new Date(proposal.decidido_em).toLocaleString('pt-BR') : '' },
    { Campo: 'Mín. aprovações', Valor: proposal.min_votos_aprovacao },
    { Campo: 'Total de membros', Valor: proposal.total_membros },
  ]);
  propSheet['!cols'] = [{ wch: 22 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, propSheet, 'Proposta');

  const sorted = [...quotes].sort((a, b) => Number(a.total) - Number(b.total));
  const bestId = sorted[0]?.id;
  const quotesSheet = XLSX.utils.json_to_sheet(
    quotes.map(q => ({
      Fornecedor: q.fornecedor,
      'Valor unit (BRL)': Number(q.valor_unit),
      Qtd: Number(q.qtd),
      'Frete (BRL)': Number(q.frete),
      'Total (BRL)': Number(q.total),
      Condições: q.condicoes ?? '',
      'Melhor preço': q.id === bestId ? 'Sim' : 'Não',
    })),
  );
  quotesSheet['!cols'] = [
    { wch: 28 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, quotesSheet, 'Cotações');

  const aprovados = votes.filter(v => v.voto === 'aprovado').length;
  const rejeitados = votes.filter(v => v.voto === 'rejeitado').length;
  const abstencoes = votes.filter(v => v.voto === 'abstencao').length;

  const voteRows = members.length > 0
    ? members.map((m, i) => {
        const v = votes.find(x => x.membro_user_id === m.user_id);
        return {
          Membro: `M${i + 1}`,
          Voto: v ? VOTE_LABEL[v.voto] : 'Pendente',
          Comentário: v?.comentario ?? '',
          'Votado em': v?.votado_em ? new Date(v.votado_em).toLocaleString('pt-BR') : '',
        };
      })
    : Array.from({ length: proposal.total_membros }).map((_, i) => ({
        Membro: `M${i + 1}`, Voto: 'Pendente', Comentário: '', 'Votado em': '',
      }));

  const votesSheet = XLSX.utils.json_to_sheet(voteRows);
  XLSX.utils.sheet_add_json(votesSheet, [
    {},
    { Membro: 'Resumo', Voto: '', Comentário: '', 'Votado em': '' },
    { Membro: 'Aprovações', Voto: aprovados },
    { Membro: 'Rejeições', Voto: rejeitados },
    { Membro: 'Abstenções', Voto: abstencoes },
    { Membro: 'Mínimo necessário', Voto: proposal.min_votos_aprovacao },
    { Membro: 'Status final', Voto: STATUS_LABEL[proposal.status] ?? proposal.status },
  ], { skipHeader: true, origin: -1 });
  votesSheet['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 40 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, votesSheet, 'Votação');

  XLSX.writeFile(wb, `${fileBase(proposal)}.xlsx`);
}
