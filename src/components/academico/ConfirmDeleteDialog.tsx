import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export function ConfirmDeleteDialog({ onConfirm, title = 'Confirmar exclusão', description, trigger, disabled }: {
  onConfirm: () => void; title?: string; description?: string; trigger?: React.ReactNode; disabled?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? <Button size="icon" variant="ghost" disabled={disabled}><Trash2 className="h-4 w-4 text-rose-600" /></Button>}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description ?? 'Esta ação não pode ser desfeita.'}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-rose-600 hover:bg-rose-700">Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
