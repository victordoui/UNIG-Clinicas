export type CampaignMedia = { url: string; name: string; type: "image" | "video" };

export async function validateCampaignMedia(file: File): Promise<"image" | "video"> {
  const extensions: Record<string, RegExp> = {
    "image/jpeg": /\.jpe?g$/i, "image/png": /\.png$/i, "image/webp": /\.webp$/i,
    "video/mp4": /\.mp4$/i, "video/webm": /\.webm$/i,
  };
  if (!extensions[file.type]?.test(file.name)) throw new Error("Formato inválido. Use JPG, PNG, WEBP, MP4 ou WebM.");
  if (file.size === 0 || file.size > 30 * 1024 * 1024) throw new Error("O arquivo deve ter conteúdo e no máximo 30 MB.");
  if (!file.type.startsWith("image/")) return "video";
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("A imagem não pôde ser lida. Escolha outro arquivo."));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
  return "image";
}
