import { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paperclip, Download, Loader2, Upload } from 'lucide-react';
import { useRequirementAttachments, useUploadRequirementAttachment, useDownloadAttachment } from '@/hooks/useRequirements';
import { toast } from '@/hooks/use-toast';

export function RequirementAttachmentList({ requirementId }: { requirementId: string }) {
  const { data: items = [], isLoading } = useRequirementAttachments(requirementId);
  const upload = useUploadRequirementAttachment();
  const download = useDownloadAttachment();
  const fileRef = useRef<HTMLInputElement>(null);

  const onUpload = async (f: File) => {
    try { await upload.mutateAsync({ requirementId, file: f }); toast({ title: 'Anexo enviado' }); }
    catch (e: any) { toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' }); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4" />Anexos</div>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}Enviar
          </Button>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum anexo.</p>}
        <div className="divide-y">
          {items.map((a: any) => (
            <div key={a.id} className="py-2 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{a.file_name}</div>
                <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString('pt-BR')}{a.size_bytes ? ` · ${Math.round(a.size_bytes / 1024)} KB` : ''}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => download.mutate(a.file_path)}><Download className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
