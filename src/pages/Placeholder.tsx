import { MainLayout } from '@/components/layout/MainLayout';
import { ModulePlaceholder } from '@/components/dashboard/ModulePlaceholder';
import { LucideIcon } from 'lucide-react';

export default function Placeholder({ title, description, icon }: { title: string; description?: string; icon?: LucideIcon }) {
  return (
    <MainLayout>
      <ModulePlaceholder title={title} description={description} icon={icon} />
    </MainLayout>
  );
}
