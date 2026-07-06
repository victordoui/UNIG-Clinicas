import { useState } from 'react';
import { useCILookup } from '@/hooks/useCI';
import { CI_STATUS_LABEL, type CIStatus } from '@/lib/ciLabels';
import { Search, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CIProtocolLookup() {
  const [protocol, setProtocol] = useState('');
  const [registration, setRegistration] = useState('');
  const lookup = useCILookup();
  const result = lookup.data;

  const submit = () => {
    if (!protocol) return;
    lookup.mutate({ protocol: protocol.trim().toUpperCase(), registration: registration.trim() || undefined });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
          <Search className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Consultar andamento</h3>
          <p className="text-sm text-slate-500">Informe o protocolo da sua CI para acompanhar.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Protocolo</label>
          <input
            type="text"
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            placeholder="CI-2026-000001"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Matrícula (opcional)</label>
          <input
            type="text"
            value={registration}
            onChange={(e) => setRegistration(e.target.value)}
            placeholder="Sua matrícula"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={submit}
          disabled={!protocol || lookup.isPending}
          className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Search className="w-4 h-4" />
          {lookup.isPending ? 'Consultando…' : 'Consultar status'}
        </button>
      </div>

      {result && !result.found && (
        <div className="mt-6 text-sm text-red-600">CI não encontrada ou matrícula inválida.</div>
      )}
      {result?.found && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono font-semibold text-slate-900">{result.protocol}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs rounded-full px-3 py-1 bg-blue-500/15 text-blue-700 font-semibold">
                {CI_STATUS_LABEL[result.status as CIStatus] ?? result.status}
              </span>
              <Link to={`/unigops/ci/imprimir/${result.protocol}`} target="_blank">
                <button className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-blue-600 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                  <Printer className="h-3.5 w-3.5" /> Imprimir
                </button>
              </Link>
            </div>
          </div>
          <div className="text-sm text-slate-700"><strong>Assunto:</strong> {result.subject}</div>
          <div className="text-sm text-slate-700"><strong>Destino:</strong> {result.destination_sector ?? '—'}</div>
          {Array.isArray(result.history) && result.history.length > 0 && (
            <div className="mt-3">
              <div className="text-xs uppercase text-slate-500 mb-2 font-semibold tracking-wider">Histórico</div>
              <ul className="space-y-1">
                {result.history.map((h: any, i: number) => (
                  <li key={i} className="text-xs flex gap-2">
                    <span className="text-slate-500">{new Date(h.at).toLocaleString('pt-BR')}</span>
                    <span className="text-slate-700">{h.event} {h.from && h.to ? `· ${h.from} → ${h.to}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
