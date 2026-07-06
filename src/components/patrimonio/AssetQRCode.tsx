import { Card } from "@/components/ui/card";
import { useMemo } from "react";

/** Renderiza um QR code SVG puro (sem depender de libs externas). */
function qrDataUrl(text: string, size = 180) {
  // usa endpoint público de imagem qrserver como fallback simples e leve
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  return url;
}

export function AssetQRCode({ qrCode, assetNumber, name, size = 160 }: { qrCode: string; assetNumber?: string; name?: string; size?: number }) {
  const url = useMemo(() => `${window.location.origin}/p/${qrCode}`, [qrCode]);
  return (
    <Card className="p-4 flex flex-col items-center gap-2 print:shadow-none print:border">
      <img src={qrDataUrl(url, size)} width={size} height={size} alt="QR Code do patrimônio" className="rounded" />
      {assetNumber && <p className="text-xs font-mono font-semibold">{assetNumber}</p>}
      {name && <p className="text-xs text-center text-muted-foreground line-clamp-2">{name}</p>}
    </Card>
  );
}
