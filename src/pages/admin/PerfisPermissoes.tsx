import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, Minus } from "lucide-react";
import { UNIG_ROLE_LABEL, UNIG_ROLE_BADGE, type UnigRole } from "@/lib/unigRoles";
import { cn } from "@/lib/utils";

type Action = "Visualizar" | "Criar" | "Editar" | "Aprovar" | "Validar" | "Configurar";
const ACTIONS: Action[] = ["Visualizar", "Criar", "Editar", "Aprovar", "Validar", "Configurar"];

const MODULES: { name: string; perms: Partial<Record<UnigRole, Action[]>> }[] = [
  {
    name: "Solicitação de Compra",
    perms: {
      super_admin: ACTIONS,
      administrador: ACTIONS,
      solicitante: ["Visualizar", "Criar"],
      compras: ["Visualizar"],
      coordenador_operacoes: ["Visualizar"],
      gerente_geral: ["Visualizar"],
    },
  },
  {
    name: "Gestão de Requisições",
    perms: {
      super_admin: ACTIONS,
      administrador: ACTIONS,
      coordenador_operacoes: ["Visualizar", "Aprovar"],
      gerente_geral: ["Visualizar", "Aprovar"],
      engenheira: ["Visualizar", "Validar"],
      validador_regulatorio: ["Visualizar", "Validar"],
      compras: ["Visualizar"],
    },
  },
  {
    name: "Compras",
    perms: {
      super_admin: ACTIONS,
      administrador: ACTIONS,
      compras: ["Visualizar", "Criar", "Editar"],
    },
  },
  {
    name: "Almoxarifado",
    perms: {
      super_admin: ACTIONS,
      administrador: ACTIONS,
      almoxarifado: ["Visualizar", "Criar", "Editar"],
    },
  },
  {
    name: "Recebimentos",
    perms: {
      super_admin: ACTIONS,
      administrador: ACTIONS,
      almoxarifado: ["Visualizar", "Criar"],
      compras: ["Visualizar"],
    },
  },
  {
    name: "Relatórios",
    perms: {
      super_admin: ACTIONS,
      administrador: ACTIONS,
      gerente_geral: ["Visualizar"],
    },
  },
  {
    name: "Conselho",
    perms: {
      super_admin: ACTIONS,
      administrador: ["Visualizar"],
      conselho: ["Visualizar", "Aprovar"],
    },
  },
  {
    name: "Administração",
    perms: {
      super_admin: ACTIONS,
      administrador: ACTIONS,
    },
  },
];

const VISIBLE_ROLES: UnigRole[] = [
  "super_admin",
  "administrador",
  "solicitante",
  "compras",
  "almoxarifado",
  "coordenador_operacoes",
  "gerente_geral",
  "engenheira",
  "validador_regulatorio",
  "conselho",
];

export default function PerfisPermissoes() {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Perfis e Permissões
          </h1>
          <p className="text-muted-foreground mt-1">
            Matriz de permissões por módulo. A edição completa estará disponível em breve.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Perfis do sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {VISIBLE_ROLES.map((r) => (
                <Badge key={r} variant="outline" className={cn("border", UNIG_ROLE_BADGE[r])}>
                  {UNIG_ROLE_LABEL[r]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matriz de Permissões (somente leitura)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2 sticky left-0 bg-muted/40">Módulo</th>
                  {VISIBLE_ROLES.map((r) => (
                    <th key={r} className="px-3 py-2 whitespace-nowrap">{UNIG_ROLE_LABEL[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((m) => (
                  <tr key={m.name} className="border-t">
                    <td className="px-3 py-2 font-medium sticky left-0 bg-background">{m.name}</td>
                    {VISIBLE_ROLES.map((r) => {
                      const acts = m.perms[r];
                      return (
                        <td key={r} className="px-3 py-2 align-top">
                          {acts && acts.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {acts.map((a) => (
                                <span key={a} className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5">
                                  <Check className="h-2.5 w-2.5" />{a}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <Minus className="h-3 w-3 text-muted-foreground/40" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
