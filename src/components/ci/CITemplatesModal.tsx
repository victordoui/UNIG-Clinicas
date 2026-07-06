import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, BookOpen, Save, Loader2 } from 'lucide-react';
import { useCITemplates } from '@/hooks/useCITemplates';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  open: boolean;
  mode: 'save' | 'load';
  onOpenChange: (v: boolean) => void;
  currentPayload?: any;
  onApply?: (payload: any) => void;
}

export function CITemplatesModal({ open, mode, onOpenChange, currentPayload, onApply }: Props) {
  const { list, save, remove } = useCITemplates();
  const { user } = useAuth();
  const [name, setName] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return;
    await save.mutateAsync({ name: name.trim(), payload: currentPayload });
    setName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'save' ? <><Save className="h-5 w-5" />Salvar como modelo</> : <><BookOpen className="h-5 w-5" />Usar modelo salvo</>}
          </DialogTitle>
          <DialogDescription>
            {mode === 'save'
              ? 'Salve a CI atual como modelo para reutilizar em pedidos recorrentes.'
              : 'Escolha um modelo para preencher o formulário automaticamente.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'save' ? (
          <div className="space-y-2">
            <Label className="text-xs">Nome do modelo</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pedido mensal de papelaria" autoFocus />
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {list.isLoading ? (
              <div className="flex items-center justify-center py-6 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando…
              </div>
            ) : !list.data || list.data.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Nenhum modelo salvo ainda.</p>
            ) : (
              list.data.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-2 border rounded p-2 hover:bg-slate-50">
                  <button
                    type="button"
                    className="flex-1 text-left text-sm"
                    onClick={() => { onApply?.(t.payload); onOpenChange(false); }}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(t.created_at).toLocaleDateString('pt-BR')}
                      {Array.isArray(t.payload?.items) && ` · ${t.payload.items.length} itens`}
                    </div>
                  </button>
                  {t.created_by === user?.id && (
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {mode === 'save' && (
            <Button onClick={handleSave} disabled={!name.trim() || save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
