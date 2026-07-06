import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Send, Trash2, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCart, useCartActions } from '@/hooks/useRequesterCart';
import { EmptyState } from '@/components/ui/empty-state';

export default function PortalSolicitante() {
  const [q, setQ] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const { organization } = useAuth();
  const orgId = organization?.organization_id;

  const { data: products = [] } = useQuery({
    queryKey: ['portal_products', orgId, q],
    enabled: !!orgId,
    queryFn: async () => {
      let req = (supabase as any).from('products')
        .select('id, name, sku, category, current_stock, unit_price')
        .eq('organization_id', orgId).order('name').limit(60);
      if (q.trim()) req = req.ilike('name', `%${q.trim()}%`);
      const { data } = await req;
      return data ?? [];
    },
  });

  const { data: cartData } = useActiveCart();
  const { addItem, updateItem, removeItem, updateCart, checkout } = useCartActions();
  const items = cartData?.items ?? [];
  const cart = cartData?.cart;
  const total = useMemo(() => items.reduce((s: number, i: any) => s + Number(i.quantidade || 0), 0), [items]);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-primary" /> Portal do Solicitante</h1>
            <p className="text-muted-foreground text-sm">Catálogo de produtos · monte seu carrinho e envie a solicitação</p>
          </div>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button className="relative">
                <ShoppingCart className="h-4 w-4 mr-2" /> Carrinho
                {items.length > 0 && <Badge className="ml-2">{items.length}</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto">
              <SheetHeader><SheetTitle>Seu carrinho</SheetTitle></SheetHeader>
              <div className="space-y-3 mt-4">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Carrinho vazio.</p>
                ) : items.map((i: any) => (
                  <div key={i.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex justify-between gap-2">
                      <p className="font-medium text-sm">{i.descricao}</p>
                      <Button size="icon" variant="ghost" onClick={() => removeItem.mutate(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Label className="text-xs">Qtd</Label>
                      <Input className="h-8 w-20" type="number" min={1} defaultValue={i.quantidade}
                        onBlur={(e) => updateItem.mutate({ id: i.id, quantidade: +e.target.value })} />
                    </div>
                    <Input placeholder="Observação" className="h-8 text-xs" defaultValue={i.observacao ?? ''}
                      onBlur={(e) => updateItem.mutate({ id: i.id, observacao: e.target.value })} />
                  </div>
                ))}
                {items.length > 0 && (
                  <div className="space-y-3 pt-2 border-t">
                    <div><Label>Justificativa</Label>
                      <Textarea rows={2} defaultValue={cart?.justificativa ?? ''}
                        onBlur={(e) => cart && updateCart.mutate({ cartId: cart.id, patch: { justificativa: e.target.value } })} />
                    </div>
                    <div><Label>Prazo desejado</Label>
                      <Input type="date" defaultValue={cart?.prazo_desejado ?? ''}
                        onBlur={(e) => cart && updateCart.mutate({ cartId: cart.id, patch: { prazo_desejado: e.target.value || null } })} />
                    </div>
                    <p className="text-sm text-muted-foreground">{items.length} item(ns) · qtd total {total}</p>
                    <Button className="w-full" onClick={() => cart && checkout.mutate({ cart, items }, { onSuccess: () => setCartOpen(false) })} disabled={checkout.isPending}>
                      <Send className="h-4 w-4 mr-2" /> Enviar solicitação
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar produto..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>

        {products.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Nenhum produto" description="Tente outra busca." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {products.map((p: any) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 space-y-2">
                  <p className="font-medium leading-tight line-clamp-2">{p.name}</p>
                  <div className="flex flex-wrap gap-1 text-xs">
                    {p.sku && <Badge variant="outline">{p.sku}</Badge>}
                    {p.category && <Badge variant="secondary">{p.category}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">Estoque: {p.current_stock ?? 0}</p>
                  <Button size="sm" className="w-full" onClick={() => cart && addItem.mutate({ cartId: cart.id, product: p })}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
