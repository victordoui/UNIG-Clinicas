/** Composição compartilhada pela prévia do editor e pela inserção da TV. */
export function CampaignArtwork({ mediaUrl, mediaType, title, message, fit = "contain" }: {
  mediaUrl?: string | null; mediaType?: string; title: string; message: string; fit?: "contain" | "cover";
}) {
  return <div className="absolute inset-0 overflow-hidden bg-[#004e48] text-white" style={{ containerType: "inline-size" }}>
    {mediaUrl && (mediaType === "video"
      ? <video src={mediaUrl} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full" style={{ objectFit: fit }} />
      : <img src={mediaUrl} alt={title || "Prévia da inserção"} className="absolute inset-0 h-full w-full" style={{ objectFit: fit }} />)}
    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[#002f2c]/95 via-[#003f3a]/10 to-transparent p-[4%]">
      <span className="absolute left-[4%] top-[5%] rounded-full border border-white/20 bg-[#003e3a]/75 px-[2%] py-[1%] text-[1.3cqw] font-bold tracking-widest">UNIG CLÍNICAS</span>
      <div className="max-w-[85%] break-words"><h2 className="text-[4.3cqw] font-black leading-tight drop-shadow-lg">{title}</h2><p className="mt-[2%] whitespace-pre-line text-[2cqw] leading-relaxed text-white/90">{message}</p></div>
    </div>
  </div>;
}
