import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { DashboardAlmoxarifado } from "@/components/dashboard/DashboardAlmoxarifado";
import { DashboardCompras } from "@/components/dashboard/DashboardCompras";
import { DashboardAdmin } from "@/components/dashboard/DashboardAdmin";
import { DashboardSolicitante } from "@/components/dashboard/DashboardSolicitante";
import { DashboardPatrimonio } from "@/components/dashboard/DashboardPatrimonio";

const Index = () => {
  const { unigRole } = useAuth();

  let content;
  switch (unigRole) {
    case "almoxarifado":
      content = <DashboardAlmoxarifado />;
      break;
    case "compras":
      content = <DashboardCompras />;
      break;
    case "patrimonio":
      content = <DashboardPatrimonio />;
      break;
    case "super_admin":
    case "administrador":
      content = <DashboardAdmin />;
      break;
    default:
      content = <DashboardSolicitante />;
  }

  return <MainLayout>{content}</MainLayout>;
};

export default Index;

