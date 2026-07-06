import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Eraser } from "lucide-react";

export interface SignatureResult {
  nome: string;
  doc?: string;
  dataUrl: string;
}

interface Props {
  onConfirm: (r: SignatureResult) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function SignaturePad({ onConfirm, onCancel, loading }: Props) {
  const ref = useRef<SignatureCanvas>(null);
  const [nome, setNome] = useState("");
  const [doc, setDoc] = useState("");

  const handleConfirm = () => {
    const sig = ref.current;
    if (!sig || sig.isEmpty()) return;
    if (!nome.trim()) return;
    onConfirm({
      nome: nome.trim(),
      doc: doc.trim() || undefined,
      dataUrl: sig.getTrimmedCanvas().toDataURL("image/png"),
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Nome do recebedor *</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
        </div>
        <div>
          <Label>Documento</Label>
          <Input value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="CPF / RG / Matrícula" />
        </div>
      </div>
      <div>
        <Label>Assinatura *</Label>
        <Card className="mt-1 bg-background overflow-hidden">
          <SignatureCanvas
            ref={ref}
            penColor="hsl(var(--foreground))"
            canvasProps={{ className: "w-full h-40 touch-none" }}
          />
        </Card>
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => ref.current?.clear()}>
          <Eraser className="h-4 w-4 mr-1" /> Limpar
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button onClick={handleConfirm} disabled={loading || !nome.trim()}>
          Confirmar assinatura
        </Button>
      </div>
    </div>
  );
}
