import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Save } from 'lucide-react';
import { useSystemSettings, useUpsertSetting } from '@/hooks/useAdmin';
import { safeJsonStringify, tryParseJson } from '@/lib/admin';
import { toast } from '@/hooks/use-toast';

export function SettingsForm() {
  const { data: settings = [], isLoading } = useSystemSettings();
  const upsert = useUpsertSetting();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const save = async (key: string, description: string | null) => {
    const raw = drafts[key];
    if (raw === undefined) return;
    const parsed = tryParseJson(raw);
    if (!parsed.ok) { toast({ title: 'JSON inválido', description: parsed.error, variant: 'destructive' }); return; }
    try {
      await upsert.mutateAsync({ key, value: parsed.value, description });
      toast({ title: 'Configuração salva' });
      setDrafts(d => { const c = { ...d }; delete c[key]; return c; });
    } catch (e: any) { toast({ title: 'Erro', description: e?.message, variant: 'destructive' }); }
  };

  const createNew = async () => {
    if (!newKey.trim()) return;
    const parsed = tryParseJson(newValue || 'null');
    if (!parsed.ok) { toast({ title: 'JSON inválido', description: parsed.error, variant: 'destructive' }); return; }
    try {
      await upsert.mutateAsync({ key: newKey.trim(), value: parsed.value, description: newDesc || null });
      toast({ title: 'Configuração criada' });
      setNewKey(''); setNewValue(''); setNewDesc('');
    } catch (e: any) { toast({ title: 'Erro', description: e?.message, variant: 'destructive' }); }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {(settings as any[]).map(s => {
          const initial = safeJsonStringify(s.value);
          const current = drafts[s.key] ?? initial;
          const dirty = drafts[s.key] !== undefined && drafts[s.key] !== initial;
          return (
            <Card key={s.key}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm font-medium">{s.key}</div>
                    {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
                  </div>
                  <Button size="sm" onClick={() => save(s.key, s.description)} disabled={!dirty || upsert.isPending}>
                    <Save className="h-3 w-3 mr-1" />Salvar
                  </Button>
                </div>
                <Textarea
                  value={current}
                  onChange={e => setDrafts(d => ({ ...d, [s.key]: e.target.value }))}
                  className="font-mono text-xs min-h-[80px]"
                />
              </CardContent>
            </Card>
          );
        })}
        {(settings as any[]).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma configuração cadastrada.</p>}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="font-medium text-sm">Nova configuração</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Chave</Label><Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="ex: general.school_name" /></div>
            <div><Label>Descrição</Label><Input value={newDesc} onChange={e => setNewDesc(e.target.value)} /></div>
          </div>
          <div>
            <Label>Valor (JSON)</Label>
            <Textarea value={newValue} onChange={e => setNewValue(e.target.value)} className="font-mono text-xs min-h-[80px]" placeholder='"exemplo" ou {"chave": "valor"}' />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={createNew} disabled={!newKey.trim() || upsert.isPending}>
              <Plus className="h-3 w-3 mr-1" />Criar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
