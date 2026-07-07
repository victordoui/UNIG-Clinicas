import { MainLayout } from '@/components/layout/MainLayout';
import { UserRolesTable } from '@/components/admin/UserRolesTable';
import { Users } from 'lucide-react';

export default function AdminUsuarios() {
  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Usuários</h1>
            <p className="text-sm text-muted-foreground">Gerencie papéis, unidades e redefinição de senha.</p>
          </div>
        </div>
        <UserRolesTable />
      </div>
    </MainLayout>
  );
}
