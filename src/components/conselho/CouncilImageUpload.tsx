import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface CouncilImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
}

export function CouncilImageUpload({ value, onChange }: CouncilImageUploadProps) {
  const { organization } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máx. 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${organization?.organization_id ?? "org"}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("council-proposals").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("council-proposals").getPublicUrl(path);
      onChange(data.publicUrl);
      toast({ title: "Imagem enviada" });
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="aspect-video w-full rounded-lg border-2 border-dashed border-border bg-muted/30 overflow-hidden flex items-center justify-center relative group">
        {value ? (
          <>
            <img src={value} alt="Pré-visualização" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-2 right-2 bg-background/90 hover:bg-background rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition"
              aria-label="Remover imagem"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="text-center text-muted-foreground p-6">
            <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Clique abaixo para enviar uma imagem</p>
            <p className="text-xs mt-1">PNG, JPG até 5MB</p>
          </div>
        )}
      </div>
      <label className="block">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button asChild variant="outline" className="w-full" disabled={uploading}>
          <span className="cursor-pointer">
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? "Enviando…" : value ? "Trocar imagem" : "Enviar imagem"}
          </span>
        </Button>
      </label>
    </div>
  );
}
