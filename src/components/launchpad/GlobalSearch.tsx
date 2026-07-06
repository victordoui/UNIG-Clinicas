import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ShoppingCart, Users, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type Result = { kind: string; id: string; label: string; subtitle?: string; to: string };

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!q || q.length < 2) { setResults([]); return; }
    const handle = setTimeout(async () => {
      setLoading(true);
      const like = `%${q}%`;
      const [pr, po, sup, prod] = await Promise.all([
        supabase.from("purchase_requests").select("id,request_number,title,status").or(`request_number.ilike.${like},title.ilike.${like}`).limit(5),
        supabase.from("purchase_orders").select("id,order_number,status").ilike("order_number", like).limit(5),
        supabase.from("suppliers").select("id,name,cnpj").or(`name.ilike.${like},cnpj.ilike.${like}`).limit(5),
        supabase.from("products").select("id,name,sku").or(`name.ilike.${like},sku.ilike.${like}`).limit(5),
      ]);
      const all: Result[] = [];
      (pr.data || []).forEach((r: any) => all.push({ kind: "SC", id: r.id, label: r.request_number || r.title, subtitle: r.status, to: `/solicitacoes/${r.id}` }));
      (po.data || []).forEach((r: any) => all.push({ kind: "Pedido", id: r.id, label: r.order_number, subtitle: r.status, to: `/pedidos/${r.id}` }));
      (sup.data || []).forEach((r: any) => all.push({ kind: "Fornecedor", id: r.id, label: r.name, subtitle: r.cnpj, to: `/fornecedores` }));
      (prod.data || []).forEach((r: any) => all.push({ kind: "Produto", id: r.id, label: r.name, subtitle: r.sku, to: `/produtos` }));
      setResults(all);
      setLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  const iconFor = (k: string) =>
    k === "SC" ? FileText : k === "Pedido" ? ShoppingCart : k === "Fornecedor" ? Users : Package;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-10 w-full md:w-[420px] justify-between text-muted-foreground font-normal"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Buscar SC, pedido, fornecedor, produto...
        </span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Digite para buscar..." value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>{loading ? "Buscando..." : "Nenhum resultado."}</CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading="Resultados">
              {results.map((r) => {
                const Icon = iconFor(r.kind);
                return (
                  <CommandItem
                    key={`${r.kind}-${r.id}`}
                    onSelect={() => { setOpen(false); navigate(r.to); }}
                  >
                    <Icon className="mr-2 h-4 w-4 text-primary" />
                    <span className="font-medium">[{r.kind}]</span>
                    <span className="ml-2">{r.label}</span>
                    {r.subtitle && <span className="ml-auto text-xs text-muted-foreground">{r.subtitle}</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
