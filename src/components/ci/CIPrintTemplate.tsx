import { QRCodeSVG } from 'qrcode.react';
import unigLogo from '@/assets/unig-facilities-logo-v2.png';
import { CI_STATUS_LABEL, type CIStatus } from '@/lib/ciLabels';

export interface CIPrintData {
  protocol: string;
  subject: string;
  status?: CIStatus | string;
  channel?: string;
  created_at?: string | null;
  requester_name?: string | null;
  requester_role?: string | null;
  requester_sector?: string | null;
  source_sector?: string | null;
  destination_sector?: string | null;
  request_type?: string | null;
  description?: string | null;
  generated_description?: string | null;
}

export interface CIPrintItem {
  id?: string;
  quantidade?: number | string | null;
  qtd?: number | string | null;
  descricao?: string | null;
  description?: string | null;
  referencia?: string | null;
  reference_url?: string | null;
  link?: string | null;
}

const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/gi;
// Linha de item: "30 – Fita durex…", "05 - Pacote…", "100- Etiqueta…"
const ITEM_LINE_RE = /^\s*\d{1,4}\s*[–\-]\s*\S.+$/;

function extractLinksAndStrip(text: string): { stripped: string; links: string[] } {
  if (!text) return { stripped: text, links: [] };
  const links: string[] = [];
  const stripped = text.replace(URL_RE, (m) => {
    links.push(m);
    return `[Referência do item ${links.length}]`;
  });
  return { stripped, links };
}

/** Divide o texto em blocos: parágrafos normais e listas de itens (linhas que parecem "qtd – descrição"). */
function splitIntoBlocks(text: string): Array<{ type: 'paragraph'; content: string } | { type: 'items'; items: string[] }> {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const blocks: Array<{ type: 'paragraph'; content: string } | { type: 'items'; items: string[] }> = [];
  let bufferPara: string[] = [];
  let bufferItems: string[] = [];

  const flushPara = () => {
    const joined = bufferPara.join('\n').trim();
    if (joined) blocks.push({ type: 'paragraph', content: joined });
    bufferPara = [];
  };
  const flushItems = () => {
    if (bufferItems.length > 0) blocks.push({ type: 'items', items: [...bufferItems] });
    bufferItems = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushItems();
      continue;
    }
    if (ITEM_LINE_RE.test(line)) {
      flushPara();
      bufferItems.push(line);
    } else {
      flushItems();
      bufferPara.push(line);
    }
  }
  flushPara();
  flushItems();
  return blocks;
}

export function CIPrintTemplate({ ci, items = [] }: { ci: CIPrintData; items?: CIPrintItem[] }) {
  const dateStr = ci.created_at
    ? new Date(ci.created_at).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  const lookupUrl = `${window.location.origin}/unigops/ci/consulta/${ci.protocol}`;

  // Itens estruturados (vindos da tabela ci_items) têm prioridade sobre o texto
  const structuredItems = (items ?? [])
    .map((it) => {
      const qty = it.quantidade ?? it.qtd ?? '';
      const desc = (it.descricao ?? it.description ?? '').toString().trim();
      const ref = (it.referencia ?? it.reference_url ?? it.link ?? '')?.toString().trim() || null;
      if (!desc && !qty) return null;
      return { qty: String(qty || '').trim(), desc, ref };
    })
    .filter(Boolean) as Array<{ qty: string; desc: string; ref: string | null }>;
  const hasStructured = structuredItems.length > 0;

  const rawBody = ci.description || ci.generated_description || '';
  const rawSecondary =
    ci.generated_description && ci.description && ci.generated_description !== ci.description
      ? ci.generated_description
      : '';

  const { stripped: bodyText, links: bodyLinks } = extractLinksAndStrip(rawBody);
  const { stripped: secondaryText, links: secondaryLinks } = extractLinksAndStrip(rawSecondary);
  const structuredLinks = structuredItems.map((i) => i.ref).filter((x): x is string => !!x);
  const allLinks = [...structuredLinks, ...bodyLinks, ...secondaryLinks];

  // Se temos itens estruturados, esconde a lista textual (mantém só parágrafos)
  const bodyBlocks = hasStructured
    ? splitIntoBlocks(bodyText).filter((b) => b.type === 'paragraph')
    : splitIntoBlocks(bodyText);
  const secondaryBlocks = hasStructured
    ? splitIntoBlocks(secondaryText).filter((b) => b.type === 'paragraph')
    : splitIntoBlocks(secondaryText);

  const renderBlocks = (
    blocks: Array<{ type: 'paragraph'; content: string } | { type: 'items'; items: string[] }>,
  ) =>
    blocks.map((b, idx) => {
      if (b.type === 'paragraph') {
        return (
          <p key={`p-${idx}`} className="ci-print-paragraph">
            {b.content}
          </p>
        );
      }
      // Itens: 1 coluna se poucos, 2 colunas se muitos
      const useTwoCols = b.items.length >= 8;
      return (
        <div
          key={`it-${idx}`}
          className={`ci-print-items ${useTwoCols ? 'ci-print-items--two-cols' : ''}`}
        >
          {b.items.map((it, i) => (
            <div key={i} className="ci-print-item">
              {it}
            </div>
          ))}
        </div>
      );
    });

  const renderStructuredItems = () => {
    if (!hasStructured) return null;
    const useTwoCols = structuredItems.length >= 8;
    return (
      <div className={`ci-print-items ${useTwoCols ? 'ci-print-items--two-cols' : ''}`}>
        {structuredItems.map((it, i) => (
          <div key={i} className="ci-print-item">
            {it.qty ? `${it.qty} — ` : ''}{it.desc}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="ci-print-sheet">
      {/* Cabeçalho */}
      <div className="ci-print-header">
        <img src={unigLogo} alt="UNIG" className="ci-print-logo" />
        <div className="ci-print-meta">
          <div className="ci-print-meta-box">Data: {dateStr}</div>
        </div>
      </div>

      <h1 className="ci-print-title">COMUNICAÇÃO INTERNA (CI)</h1>

      {/* Linhas De / Para */}
      <div className="ci-print-field">
        <div className="ci-print-label">De:</div>
        <div className="ci-print-value">
          {ci.source_sector || ci.requester_sector || '—'}
        </div>
      </div>
      <div className="ci-print-field">
        <div className="ci-print-label">Para:</div>
        <div className="ci-print-value">{ci.destination_sector || '—'}</div>
      </div>

      <div className="ci-print-subject">
        <strong>Assunto:</strong> {ci.subject}
      </div>

      {/* Corpo */}
      <div className="ci-print-body">
        <div className="ci-print-body-content">
          <p className="ci-print-paragraph">Prezados,</p>
          {renderBlocks(bodyBlocks)}
          {hasStructured && (
            <>
              <p className="ci-print-paragraph" style={{ marginTop: 10 }}>
                <strong>Itens solicitados:</strong>
              </p>
              {renderStructuredItems()}
            </>
          )}
          {secondaryBlocks.length > 0 && (
            <>
              <p className="ci-print-paragraph" style={{ marginTop: 10 }}>
                <strong>Descrição:</strong>
              </p>
              {renderBlocks(secondaryBlocks)}
            </>
          )}

          {allLinks.length > 0 && (
            <div className="ci-print-refs">
              <div className="ci-print-refs-title">Referências dos itens</div>
              <div className="ci-print-refs-grid">
                {allLinks.map((url, i) => (
                  <div key={`${i}-${url}`} className="ci-print-ref">
                    <QRCodeSVG value={url} size={70} level="M" />
                    <div className="ci-print-ref-label">Referência do item {i + 1}</div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ci-print-ref-link"
                    >
                      Abrir link
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Assinatura centralizada no fim da caixa */}
        <div className="ci-print-signer">
          <div className="ci-print-signer-name">{ci.requester_name || '—'}</div>
          {ci.requester_role && (
            <div className="ci-print-signer-role">{ci.requester_role}</div>
          )}
          {ci.requester_sector && !ci.requester_role && (
            <div className="ci-print-signer-role">{ci.requester_sector}</div>
          )}
        </div>
      </div>

      {/* Rodapé: recebido + QR */}
      <div className="ci-print-footer">
        <div className="ci-print-receipt">
          <div>Recebido em: ____/____/________</div>
          <div className="ci-print-sign-line">________________________________</div>
        </div>
        <div className="ci-print-qr">
          <QRCodeSVG value={lookupUrl} size={64} level="M" />
          <div className="ci-print-qr-label">{ci.protocol}</div>
          <a
            href={lookupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ci-print-qr-link"
          >
            Consulta da CI
          </a>
        </div>
      </div>

      {ci.status && (
        <div className="ci-print-status-line">
          Status atual: <strong>{CI_STATUS_LABEL[ci.status as CIStatus] ?? ci.status}</strong>
          {ci.channel && <> · Canal: {ci.channel}</>}
        </div>
      )}

      <style>{`
        .ci-print-sheet {
          width: 186mm;
          min-height: 270mm;
          padding: 10mm 12mm 12mm 12mm;
          margin: 0 auto;
          background: #fff;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11pt;
          line-height: 1.45;
          border: 1px solid #1e3a8a33;
          box-sizing: border-box;
        }
        .ci-print-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .ci-print-logo {
          height: 46px;
          width: auto;
          object-fit: contain;
        }
        .ci-print-meta {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-end;
        }
        .ci-print-meta-box {
          border: 1px solid #1e3a8a;
          padding: 4px 10px;
          font-size: 10pt;
          min-width: 120px;
          text-align: center;
        }
        .ci-print-title {
          font-size: 14pt;
          font-weight: bold;
          margin: 10px 0 12px 0;
          letter-spacing: 0.5px;
        }
        .ci-print-field {
          margin-bottom: 8px;
        }
        .ci-print-label {
          font-size: 9pt;
          font-weight: bold;
          margin-bottom: 2px;
        }
        .ci-print-value {
          border: 1px solid #1e3a8a;
          padding: 5px 10px;
          min-height: 20px;
          font-size: 11pt;
        }
        .ci-print-subject {
          margin: 10px 0 8px 0;
          font-size: 10.5pt;
        }
        .ci-print-body {
          border: 1px solid #1e3a8a;
          padding: 14px 18px;
          min-height: 175mm;
          display: flex;
          flex-direction: column;
        }
        .ci-print-body-content {
          flex: 1;
        }
        .ci-print-paragraph {
          margin: 0 0 8px 0;
          white-space: pre-wrap;
        }
        .ci-print-items {
          margin: 4px 0 10px 0;
        }
        .ci-print-items--two-cols {
          column-count: 2;
          column-gap: 28px;
          column-fill: balance;
        }
        .ci-print-item {
          font-size: 10.5pt;
          line-height: 1.5;
          padding: 1px 0 1px 8px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .ci-print-signer {
          margin-top: 24px;
          text-align: center;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .ci-print-signer-name {
          font-weight: 600;
        }
        .ci-print-signer-role {
          font-size: 9.5pt;
          color: #333;
        }
        .ci-print-footer {
          margin-top: 14px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .ci-print-receipt {
          flex: 1;
          text-align: center;
          font-size: 10pt;
        }
        .ci-print-sign-line {
          margin-top: 4px;
          letter-spacing: 1px;
        }
        .ci-print-qr {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .ci-print-qr-label {
          font-family: monospace;
          font-size: 8pt;
        }
        .ci-print-status-line {
          margin-top: 8px;
          font-size: 8.5pt;
          color: #555;
          text-align: center;
        }
        .ci-print-refs {
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1px dashed #1e3a8a55;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .ci-print-refs-title {
          font-size: 9.5pt;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .ci-print-refs-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
        }
        .ci-print-ref {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        .ci-print-ref-label {
          font-size: 8pt;
          color: #333;
        }
        .ci-print-ref-link,
        .ci-print-qr-link {
          font-size: 8pt;
          color: #1e3a8a;
          text-decoration: underline;
          word-break: break-all;
          text-align: center;
        }

        @media print {
          @page { size: A4; margin: 10mm 12mm 12mm 12mm; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .ci-print-sheet {
            border: none;
            width: 186mm;
            min-height: auto;
            padding: 0;
            box-shadow: none;
          }
          .ci-print-body {
            min-height: 200mm;
          }
          .ci-print-no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
