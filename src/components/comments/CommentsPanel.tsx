import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCommentsThread, useAddComment, useResolveThread, type EntidadeTipo } from "@/hooks/useComments";
import { MessageSquare, Check, Send } from "lucide-react";

interface Props {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
}

export function CommentsPanel({ entidadeTipo, entidadeId }: Props) {
  const { data, isLoading } = useCommentsThread(entidadeTipo, entidadeId);
  const add = useAddComment(entidadeTipo, entidadeId);
  const resolve = useResolveThread(entidadeTipo, entidadeId);
  const [text, setText] = useState("");

  const submit = async () => {
    if (!text.trim()) return;
    await add.mutateAsync({ conteudo: text.trim() });
    setText("");
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Comentários
          </CardTitle>
          {data?.thread && (
            <div className="flex items-center gap-2">
              {data.thread.resolvido ? (
                <Badge variant="outline" className="text-emerald-600">Resolvido</Badge>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => resolve.mutate(data.thread!.id)}>
                  <Check className="h-3.5 w-3.5 mr-1" />Resolver
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : data?.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem comentários ainda.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {data?.comments.map((c) => (
              <div key={c.id} className="rounded-lg border p-2.5 bg-muted/30">
                <p className="text-sm whitespace-pre-wrap">{c.conteudo}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(c.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um comentário…"
            rows={2}
          />
          <LoadingButton loading={add.isPending} onClick={submit} size="sm" className="w-full">
            <Send className="h-3.5 w-3.5 mr-1" /> Enviar
          </LoadingButton>
        </div>
      </CardContent>
    </Card>
  );
}
