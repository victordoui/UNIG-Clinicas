import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";
import { useMySupplier } from "@/hooks/useSupplierPortal";
import { isSupplierApproved, SUPPLIER_STATUS_LABEL, type SupplierStatus } from "@/lib/supplierLabels";

interface Props { children: React.ReactNode; }

/**
 * Bloqueia o conteúdo se o fornecedor não estiver aprovado e
 * não tiver acesso liberado manualmente.
 */
export function SupplierAccessGate({ children }: Props) {
  const { data: supplier, isLoading } = useMySupplier();
  if (isLoading) return null;
  if (isSupplierApproved(supplier?.status, supplier?.acesso_liberado_manual)) {
    return <>{children}</>;
  }
  const label = SUPPLIER_STATUS_LABEL[(supplier?.status ?? "cadastro_incompleto") as SupplierStatus];
  return (
    <Card className="rounded-2xl border-amber-200 bg-amber-50/40 animate-fade-in">
      <CardContent className="py-10 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
          <Lock className="h-7 w-7 text-amber-700" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Recurso disponível após aprovação do cadastro</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Status atual: <strong>{label}</strong>. Complete seu cadastro e aguarde a análise da UNIG
            para acessar licitações, pedidos e notas fiscais.
          </p>
        </div>
        <Button asChild>
          <Link to="/portal-fornecedor/completar-cadastro">
            Completar cadastro <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
