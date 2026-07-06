import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { useMySupplier, useSupplierDocuments } from "@/hooks/useSupplierPortal";
import {
  SUPPLIER_STATUS_BADGE, SUPPLIER_STATUS_LABEL, isSupplierApproved,
  type SupplierStatus,
} from "@/lib/supplierLabels";

export function computeRegistrationProgress(supplier: any, docs: any[]): number {
  if (!supplier) return 0;
  const checks = [
    !!supplier.razao_social && !!supplier.cnpj, // empresa
    !!supplier.endereco_logradouro,             // endereço
    !!supplier.email && !!supplier.telefone,    // contatos
    Array.isArray(supplier.categorias) && supplier.categorias.length > 0, // categorias
    docs.some((d) => d.status === "enviado" || d.status === "aprovado"),  // documentos
    !!supplier.banco_nome || !!supplier.banco_conta,                      // bancário (best-effort)
    !!supplier.declaracoes_aceitas,                                       // declarações
    supplier.status === "em_analise" || supplier.status === "aprovado",   // revisão enviada
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function SupplierStatusBanner() {
  const { data: supplier } = useMySupplier();
  const { data: docs = [] } = useSupplierDocuments();
  if (!supplier) return null;

  const approved = isSupplierApproved(supplier.status, supplier.acesso_liberado_manual);
  const status = (supplier.status ?? "cadastro_incompleto") as SupplierStatus;
  const progress = computeRegistrationProgress(supplier, docs);

  if (approved) {
    return (
      <Card className="rounded-2xl border-emerald-200 bg-emerald-50/40">
        <CardContent className="p-3 flex items-center gap-3 text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div className="flex-1">
            <span className="font-medium">Cadastro aprovado.</span>{" "}
            <span className="text-muted-foreground">Você já pode participar de cotações e receber pedidos.</span>
          </div>
          <Badge variant="outline" className={SUPPLIER_STATUS_BADGE[status]}>{SUPPLIER_STATUS_LABEL[status]}</Badge>
        </CardContent>
      </Card>
    );
  }

  const isAnalise = status === "em_analise";
  const icon = isAnalise ? Clock : AlertTriangle;
  const Icon = icon;

  return (
    <Card className={isAnalise ? "rounded-2xl border-blue-200 bg-blue-50/40" : "rounded-2xl border-amber-200 bg-amber-50/40"}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Icon className={isAnalise ? "h-5 w-5 text-blue-600 mt-0.5" : "h-5 w-5 text-amber-700 mt-0.5"} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">
                {isAnalise ? "Cadastro em análise" : "Cadastro incompleto"}
              </span>
              <Badge variant="outline" className={SUPPLIER_STATUS_BADGE[status]}>{SUPPLIER_STATUS_LABEL[status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isAnalise
                ? "A equipe da UNIG está analisando seu cadastro. Você será notificado por aqui."
                : "Complete seu cadastro para participar de cotações, enviar propostas e receber pedidos."}
            </p>
          </div>
          {!isAnalise && (
            <Button asChild size="sm">
              <Link to="/portal-fornecedor/completar-cadastro">
                Completar cadastro <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progresso do cadastro</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
