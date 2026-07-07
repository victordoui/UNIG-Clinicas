import { MainLayout } from '@/components/layout/MainLayout';
import { PermissionsMatrixTable } from '@/components/admin/PermissionsMatrixTable';
import { ShieldCheck } from 'lucide-react';

export default function AdminPermissoes() {
  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Perfis e Permissões</h1>
            <p className="text-sm text-muted-foreground">Matriz de permissões por módulo (R=ler, C=criar, U=editar, D=excluir).</p>
          </div>
        </div>
        <PermissionsMatrixTable />
      </div>
    </MainLayout>
  );
}
