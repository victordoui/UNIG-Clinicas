import { CommentsPanel } from '@/components/comments/CommentsPanel';

export function CIComentariosTab({ ciId }: { ciId: string }) {
  return (
    <div className="max-w-2xl animate-fade-in">
      <CommentsPanel entidadeTipo="ci_request" entidadeId={ciId} />
    </div>
  );
}
