import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/hooks/use-toast';
import { Paperclip, FileText, Download, Trash2, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  ciId: string;
  organizationId: string;
  validationType: 'tecnica' | 'regulatoria';
  /** When true, only lists attachments (no upload/delete UI). */
  readOnly?: boolean;
}

const BUCKET = 'ci-validation-docs';

export function ValidationAttachments({ ciId, organizationId, validationType, readOnly }: Props) {
  const { user, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['ci_validation_attachments', ciId, validationType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ci_validation_attachments' as any)
        .select('*')
        .eq('ci_id', ciId)
        .eq('validation_type', validationType)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const remove = useMutation({
    mutationFn: async (row: any) => {
      await supabase.storage.from(BUCKET).remove([row.file_path]);
      const { error } = await supabase
        .from('ci_validation_attachments' as any)
        .delete()
        .eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ci_validation_attachments', ciId, validationType] });
      toast({ title: 'Anexo removido' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const handleUpload = async (file: File) => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${organizationId}/${ciId}/${validationType}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('ci_validation_attachments' as any).insert({
        ci_id: ciId,
        organization_id: organizationId,
        validation_type: validationType,
        uploaded_by: user.id,
        file_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
      });
      if (insErr) throw insErr;
      qc.invalidateQueries({ queryKey: ['ci_validation_attachments', ciId, validationType] });
      toast({ title: 'Documento anexado' });
    } catch (e: any) {
      toast({ title: 'Erro ao anexar', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const download = async (row: any) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.file_path, 60);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        Documentos de apoio
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">Nenhum documento anexado.</div>
      ) : (
        <ul className="space-y-1">
          {items.map((row) => {
            const canDelete = !readOnly && (isSuperAdmin || row.uploaded_by === user?.id);
            return (
              <li key={row.id} className="flex items-center gap-2 rounded-md border bg-background/60 px-2 py-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{row.file_name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: ptBR })}
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => download(row)} title="Baixar">
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {canDelete && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => remove.mutate(row)} title="Remover">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && (
        <div>
          <input
            id={`val-att-${ciId}-${validationType}`}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = '';
            }}
          />
          <LoadingButton
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            loading={uploading}
            onClick={() => document.getElementById(`val-att-${ciId}-${validationType}`)?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-1" /> Anexar documento
          </LoadingButton>
        </div>
      )}
    </div>
  );
}
