import {
  BookOpen, CheckCircle, Clock, FileCheck2, FileText, HelpCircle,
  Lightbulb, MessageSquare, Paperclip, Route, ShieldCheck, Tag, Upload,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const CHECKLIST = [
  'Descrição detalhada do item ou serviço',
  'Quantidade estimada e unidade de medida',
  'Justificativa e objetivo da solicitação',
  'Centro de custo, quando aplicável',
  'Links, fotos, cotações ou documentos de referência',
  'Prazo desejado ou impacto caso a compra atrase',
];

const TOPICS = [
  {
    icon: FileText,
    title: 'Como descrever a demanda',
    desc: 'Informe especificação técnica, marca/modelo aceitável, quantidade, local de uso e qualquer restrição que ajude a equipe a comprar corretamente.',
  },
  {
    icon: MessageSquare,
    title: 'Justificativa objetiva',
    desc: 'Explique por que a demanda é necessária, qual atividade será atendida e o impacto operacional ou acadêmico da solicitação.',
  },
  {
    icon: Tag,
    title: 'Centro de custo',
    desc: 'Quando houver alocação orçamentária específica, indique o código ou nome do centro de custo para acelerar análise e aprovação.',
  },
  {
    icon: Paperclip,
    title: 'Anexos e referências',
    desc: 'Inclua links de fornecedores, imagens, laudos, memorandos ou documentos técnicos que reduzam dúvidas na etapa de cotação.',
  },
];

const FLOW = [
  { label: 'Abertura', desc: 'Solicitante registra a CI pelo formulário ou chatbot.' },
  { label: 'Triagem', desc: 'Facilities confere dados, classificação e necessidade de ajustes.' },
  { label: 'Aprovação', desc: 'A demanda passa pelas alçadas definidas conforme tipo e valor.' },
  { label: 'Cotação', desc: 'Compras consulta fornecedores e formaliza a melhor opção.' },
  { label: 'Entrega', desc: 'Pedido é recebido, conferido e vinculado ao atendimento.' },
];

const FAQ = [
  {
    q: 'Quando devo abrir uma CI?',
    a: 'Abra uma CI para solicitar compra de materiais, equipamentos, serviços, manutenção, infraestrutura ou itens necessários para a operação do setor.',
  },
  {
    q: 'Posso alterar uma CI depois de enviada?',
    a: 'Se a equipe solicitar ajuste, complemente as informações no fluxo indicado. Para mudança grande, pode ser necessário abrir uma nova requisição.',
  },
  {
    q: 'Como acompanho o andamento?',
    a: 'Use a página Acompanhamentos ou Minhas CIs para consultar status, protocolo, histórico e detalhes da requisição.',
  },
  {
    q: 'O que deixa uma CI mais rápida?',
    a: 'Descrição completa, justificativa clara, referências anexadas e dados pessoais atualizados reduzem retrabalho e dúvidas na triagem.',
  },
];

export default function CIPublicBaseConhecimento() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1 max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-600" /> Base de Conhecimento
        </h1>
        <p className="text-sm text-slate-500">Orientações práticas para abrir uma CI completa, rastreável e com menos retrabalho.</p>
      </div>

      <section className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 rounded-2xl border-blue-200/60 bg-blue-50/40 p-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Checklist antes de enviar</h2>
              <p className="text-sm text-slate-500">Confira os pontos essenciais antes de registrar sua requisição.</p>
            </div>
          </div>
          <ul className="grid sm:grid-cols-2 gap-2.5 text-[13px]">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-2 text-slate-700">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-sm p-6">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Lightbulb className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Dica rápida</h2>
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            Uma boa CI responde três perguntas: o que precisa ser comprado, por que é necessário e onde será utilizado.
          </p>
          <Badge variant="outline" className="mt-4 bg-emerald-50 text-emerald-700 border-emerald-200">
            Menos ajustes na triagem
          </Badge>
        </Card>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        {TOPICS.map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="rounded-2xl border-slate-200/80 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <Card className="rounded-2xl border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Route className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">Fluxo padrão da CI</h2>
        </div>
        <div className="grid md:grid-cols-5 gap-3">
          {FLOW.map((step, index) => (
            <div key={step.label} className="relative rounded-xl border border-slate-200 bg-white p-4">
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold mb-3">
                {index + 1}
              </div>
              <h3 className="text-sm font-bold text-slate-900">{step.label}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-2xl border-blue-200/60 bg-blue-50/30 shadow-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Cadastro em lote de itens</h2>
            <p className="text-sm text-slate-500">Adicione vários itens de uma só vez ao abrir uma CI pelo Formulário.</p>
          </div>
        </div>
        <ol className="space-y-2 text-sm text-slate-700 list-decimal pl-5">
          <li>No <strong>Formulário</strong> de CI, na seção <em>Itens solicitados</em>, clique em <strong>Importar em lote</strong>.</li>
          <li>Cole a lista ou anexe um arquivo <code>.csv</code> / <code>.txt</code>. Cada linha vira um item.</li>
          <li>Formato sugerido por linha: <code>descrição; quantidade; unidade; especificação</code>. Exemplo: <code>Caneta azul; 50; UN; Ponta fina</code>.</li>
          <li>Revise a pré-visualização e clique em <strong>Adicionar</strong>. Os itens entram na CI e podem ser editados antes do envio.</li>
        </ol>
        <p className="text-xs text-slate-500 mt-3">Dica: para listas recorrentes, salve a CI como <strong>modelo</strong> e reutilize nas próximas requisições.</p>
      </Card>

      <section className="grid lg:grid-cols-3 gap-5">
        <Card className="rounded-2xl border-slate-200/80 shadow-sm p-6">
          <Clock className="h-6 w-6 text-amber-600 mb-3" />
          <h2 className="font-bold text-slate-900">Prazos</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Demandas urgentes devem trazer justificativa concreta para priorização e análise da equipe responsável.
          </p>
        </Card>
        <Card className="rounded-2xl border-slate-200/80 shadow-sm p-6">
          <ShieldCheck className="h-6 w-6 text-emerald-600 mb-3" />
          <h2 className="font-bold text-slate-900">Conferência</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Confira dados pessoais, setor, destino e descrição antes de enviar para evitar retrabalho no fluxo.
          </p>
        </Card>
        <Card className="rounded-2xl border-slate-200/80 shadow-sm p-6">
          <HelpCircle className="h-6 w-6 text-violet-600 mb-3" />
          <h2 className="font-bold text-slate-900">Dúvidas</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Use o chatbot ou consulte suas CIs anteriores quando quiser reaproveitar informações de uma demanda parecida.
          </p>
        </Card>
      </section>

      <Card className="rounded-2xl border-slate-200/80 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-3">Perguntas frequentes</h2>
        <Accordion type="single" collapsible>
          {FAQ.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-slate-600 leading-relaxed">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </div>
  );
}
