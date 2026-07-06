import { Button } from "@/components/ui/button";
import { Settings2, Save, X, RotateCcw } from "lucide-react";

interface LaunchpadCustomizerProps {
  editing: boolean;
  dirty: boolean;
  saving?: boolean;
  onEnter: () => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
}

export function LaunchpadCustomizer({
  editing, dirty, saving, onEnter, onSave, onCancel, onReset,
}: LaunchpadCustomizerProps) {
  if (!editing) {
    return (
      <Button variant="outline" size="sm" onClick={onEnter}>
        <Settings2 className="h-4 w-4" /> Personalizar
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 items-center bg-primary/5 border border-primary/20 rounded-md px-3 py-2 animate-fade-in">
      <span className="text-xs font-medium text-primary mr-1">Modo edição</span>
      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw className="h-4 w-4" /> Restaurar padrão
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        <X className="h-4 w-4" /> Cancelar
      </Button>
      <Button size="sm" onClick={onSave} disabled={!dirty || saving}>
        <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}
