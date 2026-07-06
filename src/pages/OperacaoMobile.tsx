import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  PackageCheck,
  ClipboardCheck,
  Tag,
  QrCode,
  Wifi,
  WifiOff,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Action {
  title: string;
  icon: any;
  href: string;
  color: string;
}

const actions: Action[] = [
  { title: "Entrada rápida", icon: ArrowDownToLine, href: "/movimentacoes?op=entrada", color: "text-success" },
  { title: "Saída rápida", icon: ArrowUpFromLine, href: "/movimentacoes?op=saida", color: "text-destructive" },
  { title: "Transferência", icon: ArrowRightLeft, href: "/movimentacoes?op=transferencia", color: "text-primary" },
  { title: "Conferir recebimento", icon: PackageCheck, href: "/pedidos", color: "text-warning" },
  { title: "Inventário", icon: ClipboardCheck, href: "/inventario", color: "text-primary" },
  { title: "Etiquetas", icon: Tag, href: "/etiquetas", color: "text-foreground" },
];

export default function OperacaoMobile() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Smartphone className="h-6 w-6 text-primary" /> Operação</h1>
            <p className="text-sm text-muted-foreground">Atalhos de campo</p>
          </div>
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${online ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {online ? "Online" : "Offline"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {actions.map((a) => (
            <Link key={a.href} to={a.href}>
              <Card className="aspect-square flex flex-col items-center justify-center gap-2 p-4 hover:shadow-md transition-shadow active:scale-95">
                <a.icon className={`h-10 w-10 ${a.color}`} />
                <span className="text-sm font-medium text-center">{a.title}</span>
              </Card>
            </Link>
          ))}
        </div>

        <Link to="/scanner">
          <Card className="p-4 flex items-center justify-center gap-2 hover:shadow-md transition-shadow active:scale-95">
            <QrCode className="h-6 w-6 text-primary" />
            <span className="font-medium">Abrir Scanner</span>
          </Card>
        </Link>
      </div>
    </MainLayout>
  );
}
