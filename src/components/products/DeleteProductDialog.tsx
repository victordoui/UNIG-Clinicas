import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, MapPin, DollarSign, Activity, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryBadge } from "@/lib/categoryUtils";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  current_stock: number;
  min_stock: number;
  unit_price?: number;
  location?: string;
}

interface DeleteProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

export function DeleteProductDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
  isDeleting = false,
}: DeleteProductDialogProps) {
  const [movementsCount, setMovementsCount] = useState<number>(0);
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!open || !product?.id) return;

      setIsLoading(true);
      try {
        // Contar movimentações
        const { count: movCount } = await supabase
          .from("movements")
          .select("*", { count: "exact", head: true })
          .eq("product_id", product.id);

        // Contar alertas
        const { count: alertCount } = await supabase
          .from("alerts")
          .select("*", { count: "exact", head: true })
          .eq("product_id", product.id);

        setMovementsCount(movCount || 0);
        setAlertsCount(alertCount || 0);
      } catch (error) {
        console.error("Erro ao buscar contadores:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, [open, product?.id]);

  if (!product) return null;

  const hasRelatedData = movementsCount > 0 || alertsCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Produto
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Você está prestes a excluir permanentemente este produto:
              </p>

              {/* Informações do Produto */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{product.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      SKU: {product.sku}
                    </p>
                    <div className="mt-1">
                      {getCategoryBadge(product.category)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Quantidade</p>
                      <p className="font-medium text-foreground">
                        {product.current_stock} un.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Unit.</p>
                      <p className="font-medium text-foreground">
                        {product.unit_price
                          ? `R$ ${product.unit_price.toFixed(2)}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {product.location && (
                    <div className="flex items-center gap-2 col-span-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Localização</p>
                        <p className="font-medium text-foreground font-mono">
                          {product.location}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Aviso de dados relacionados */}
              {isLoading ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  Carregando informações...
                </div>
              ) : hasRelatedData ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Activity className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive">
                        Atenção: Dados vinculados serão removidos
                      </p>
                      <ul className="mt-1 text-muted-foreground space-y-0.5">
                        {movementsCount > 0 && (
                          <li>• {movementsCount} movimentação(ões)</li>
                        )}
                        {alertsCount > 0 && (
                          <li>• {alertsCount} alerta(s)</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}

              <p className="text-sm text-muted-foreground">
                Esta ação <span className="font-semibold text-destructive">não pode ser desfeita</span>.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm();
            }}
            disabled={isDeleting || isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Excluindo..." : "Excluir Permanentemente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
