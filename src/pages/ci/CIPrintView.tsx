import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CIPrintTemplate, type CIPrintData, type CIPrintItem } from '@/components/ci/CIPrintTemplate';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';

interface Props {
  /** 'auth' = busca pela id (interno autenticado); 'public' = busca via RPC ci_lookup pelo protocolo */
  mode: 'auth' | 'public';
}

async function waitForRender() {
  // Aguarda fontes + imagens antes de chamar window.print()
  try {
    if ((document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }
  } catch {}
  const imgs = Array.from(document.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.addEventListener('load', () => res(), { once: true });
            img.addEventListener('error', () => res(), { once: true });
          }),
    ),
  );
  // mais um frame pra layout final
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
}

export default function CIPrintView({ mode }: Props) {
  const params = useParams();
  const [search] = useSearchParams();
  const [ci, setCi] = useState<CIPrintData | null>(null);
  const [items, setItems] = useState<CIPrintItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        if (mode === 'auth' && params.id) {
          const { data, error } = await supabase
            .from('ci_requests' as any)
            .select('*')
            .eq('id', params.id)
            .single();
          if (error) throw error;
          if (cancel) return;
          setCi(data as unknown as CIPrintData);
          // buscar itens cadastrados em lote
          const { data: itemRows } = await supabase
            .from('ci_items' as any)
            .select('*')
            .eq('ci_id', params.id)
            .order('created_at', { ascending: true });
          if (!cancel && itemRows) setItems(itemRows as unknown as CIPrintItem[]);
        } else if (mode === 'public' && params.protocolo) {
          const { data, error } = await supabase.rpc('ci_lookup' as any, {
            p_protocol: params.protocolo,
            p_registration: null,
          });
          if (error) throw error;
          const d = data as any;
          if (!d?.found) {
            if (!cancel) setError('CI não encontrada.');
            return;
          }
          if (cancel) return;
          setCi(d as CIPrintData);
          // tenta buscar itens — pode retornar vazio caso RLS bloqueie, daí cai no fallback do texto
          if (d.id) {
            const { data: itemRows } = await supabase
              .from('ci_items' as any)
              .select('*')
              .eq('ci_id', d.id)
              .order('created_at', { ascending: true });
            if (!cancel && itemRows) setItems(itemRows as unknown as CIPrintItem[]);
          }
        }
      } catch (e: any) {
        if (!cancel) setError(e.message || 'Erro ao carregar CI.');
      }
    })();
    return () => { cancel = true; };
  }, [mode, params.id, params.protocolo]);

  useEffect(() => {
    if (!ci || search.get('auto') !== '1') return;
    let cancelled = false;
    (async () => {
      await waitForRender();
      if (!cancelled) window.print();
    })();
    return () => { cancelled = true; };
  }, [ci, search]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-red-600">{error}</p>
          <Link to={mode === 'public' ? '/unigops/ci/consulta' : '/dashboard/ci'}>
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!ci) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="min-h-screen bg-muted/40 py-6">
      <div className="ci-print-no-print max-w-[180mm] mx-auto mb-4 flex items-center justify-between">
        <Link
          to={mode === 'public' ? `/unigops/ci/consulta` : `/dashboard/ci/${params.id}`}
          className="text-sm text-blue-700 hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="h-4 w-4 mr-2" /> Imprimir
        </Button>
      </div>
      <CIPrintTemplate ci={ci} items={items} />
    </div>
  );
}
