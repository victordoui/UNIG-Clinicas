import { useParams } from 'react-router-dom';
import { useState } from 'react';
import EsteiraDetalhe from '@/pages/esteira/EsteiraDetalhe';
import { Tabs, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { CIItemsTab } from '@/components/ci/detail/CIItemsTab';
import { CIQuotesTab } from '@/components/ci/detail/CIQuotesTab';
import { CIPurchaseOrderTab } from '@/components/ci/detail/CIPurchaseOrderTab';
import { CIDeliveryTab } from '@/components/ci/detail/CIDeliveryTab';
import { CIComentariosTab } from '@/components/ci/detail/CIComentariosTab';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileText, Package, DollarSign, FileSignature, Truck, MessageSquare } from 'lucide-react';

export default function CIDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState('visao');

  if (!id) return null;

  return (
    <MainLayout>
      <div className="space-y-4">
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsPrimitive.List className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-muted/40 border border-border/50 p-1.5 shadow-sm">
            {/* Grupo: Fluxo */}
            <div className="flex items-center gap-1">
              <TabsTrigger value="visao" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <FileText className="h-4 w-4 mr-2" />Visão Geral
              </TabsTrigger>
            </div>

            {/* Separador */}
            <div className="mx-1 h-6 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

            {/* Grupo: Operação */}
            <div className="flex items-center gap-1">
              <TabsTrigger value="itens" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <Package className="h-4 w-4 mr-2" />Itens
              </TabsTrigger>
              <TabsTrigger value="cotacoes" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <DollarSign className="h-4 w-4 mr-2" />Cotações
              </TabsTrigger>
              <TabsTrigger value="pedido" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <FileSignature className="h-4 w-4 mr-2" />Pedido Alterdata
              </TabsTrigger>
              <TabsTrigger value="entrega" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <Truck className="h-4 w-4 mr-2" />Entrega
              </TabsTrigger>
            </div>

            {/* Separador */}
            <div className="mx-1 h-6 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

            {/* Grupo: Comunicação */}
            <div className="flex items-center gap-1">
              <TabsTrigger value="comentarios" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <MessageSquare className="h-4 w-4 mr-2" />Comentários
              </TabsTrigger>
            </div>
          </TabsPrimitive.List>


          <TabsContent value="visao" className="m-0">
            <EsteiraDetalhe ciId={id} embedded />
          </TabsContent>
          <TabsContent value="itens" className="m-0"><CIItemsTab ciId={id} /></TabsContent>
          <TabsContent value="cotacoes" className="m-0"><CIQuotesTab ciId={id} /></TabsContent>
          <TabsContent value="pedido" className="m-0"><CIPurchaseOrderTab ciId={id} /></TabsContent>
          <TabsContent value="entrega" className="m-0"><CIDeliveryTab ciId={id} /></TabsContent>
          <TabsContent value="comentarios" className="m-0"><CIComentariosTab ciId={id} /></TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
