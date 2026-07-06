import { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paperclip, Upload, X, Download } from 'lucide-react';
import {
  useDemandAttachments, useUploadDemandAttachment, useDeleteDemandAttachment, getDemandAttachmentUrl,
} from '@/hooks/useOperationalDemands';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function DemandAttachments({ demandId }: { demandId: string }) {
  const { data: items = [], isLoading } = useDemandAttachments(demandId);
  const upload = useUploadDemandAttachment();
  const remove = useDeleteDemandAttachment();
  const ref = useRef<HTMLInputElement>(null);

  async function open(path: string) {
    const url = await getDemandAttachmentUrl(path);
    window.open(url, '_blank');
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="h-4 w-4" /> Anexos ({items.length})
        </div>
        <Button size="sm" variant="outline" onClick={() => ref.current?.click()} disabled={upload.isPending}>
          <Upload className="h-4 w-4 mr-1" /> {upload.isPending ? 'Enviando…' : 'Enviar arquivo'}
        </Button>
        <input
          ref={ref}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate({ demandId, file: f });
            if (ref.current) ref.current.value = '';
          }}
        />
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-xs text-muted-foreground p-3 text-center">Nenhum anexo enviado.</p>
      )}

      <div className="space-y-1">
        {items.map((a: any) => (
          <div key={a.id} className="flex items-center justify-between border rounded p-2 text-sm">
            <div className="min-w-0">
              <div className="font-medium truncate">{a.file_name}</div>
              <div className="text-xs text-muted-foreground">
                {((a.file_size ?? 0) / 1024).toFixed(1)} KB • {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={() => open(a.file_path)}>
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => remove.mutate({ id: a.id, file_path: a.file_path, demandId })}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
