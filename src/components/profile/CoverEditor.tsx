import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Move, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Upload, Loader2, Check, RotateCcw, Clock, CheckCircle2, Hourglass, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfileCover, CoverState, CoverType, resolveCoverStyle } from '@/hooks/useProfileCover';
import { COVER_PRESETS, COLOR_SWATCHES, GRADIENT_PRESETS, KPI_ACCENT_OPTIONS, KpiAccent, KpiSlot, KpiToneId, KPI_TONE_PALETTE, KPI_MULTI_DEFAULT, getTone, SIDEBAR_BLUE, getPresetById, BLUE_PALETTE, CTA_STYLE_OPTIONS, CtaStyle } from '@/lib/coverPresets';
import { toast } from 'sonner';

const DEFAULT_COVER: CoverState = {
  type: 'color',
  value: { color: SIDEBAR_BLUE },
  overlay: 0.35,
  kpiAccent: 'glass',
  ctaStyle: 'glass',
};

type Props = { open: boolean; onOpenChange: (o: boolean) => void };

// Tab values: 'image' tab covers both 'image' and 'combo' cover types
type TabValue = 'preset' | 'color' | 'gradient' | 'image' | 'kpi';

export function CoverEditor({ open, onOpenChange }: Props) {
  const { state, update, uploadCoverImage } = useProfileCover();
  const [draft, setDraft] = useState<CoverState>(state);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const initialTab = (s: CoverState): TabValue => {
    if (s.type === 'combo' && s.value.preset) return 'preset';
    if (s.type === 'combo') return 'image';
    return s.type as TabValue;
  };
  const [tab, setTab] = useState<TabValue>(initialTab(state));
  const previewRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(state);
      setTab(initialTab(state));
    }
  }, [open, state]);

  const resolved = resolveCoverStyle(draft);

  // Preset tab is "active type" when type==='preset' OR combo derived from a preset
  const isPresetMode = draft.type === 'preset' || (draft.type === 'combo' && !!draft.value.preset);
  // Switch "Aplicar degradê azul" ligado quando NÃO é preset puro com plain=true
  const presetGradientOn = !(draft.type === 'preset' && draft.value.plain === true) && isPresetMode;

  const onTabChange = (v: string) => {
    const next = v as TabValue;
    setTab(next);
    if (next === 'kpi') return; // KPI tab does not change cover type
    if (next === 'preset' && !isPresetMode) {
      setDraft({ ...draft, type: 'preset', value: { preset: 'unig-default' } });
    } else if (next === 'color' && draft.type !== 'color') {
      setDraft({ ...draft, type: 'color', value: { color: draft.value.color ?? SIDEBAR_BLUE } });
    } else if (next === 'gradient' && draft.type !== 'gradient') {
      setDraft({ ...draft, type: 'gradient', value: { from: SIDEBAR_BLUE, to: '#3B82F6', angle: 135 } });
    } else if (next === 'image') {
      const isImageMode = draft.type === 'image' || (draft.type === 'combo' && !draft.value.preset);
      if (!isImageMode) {
        setDraft({ ...draft, type: 'image', value: {} });
      }
    }
  };


  const setImageMode = (mode: 'image' | 'combo') => {
    if (mode === 'image') {
      setDraft({ ...draft, type: 'image', value: { url: draft.value.url, posX: draft.value.posX, posY: draft.value.posY } });
    } else {
      setDraft({
        ...draft,
        type: 'combo',
        value: {
          from: draft.value.from ?? '#1E40AF',
          to: draft.value.to ?? 'transparent',
          angle: draft.value.angle ?? 90,
          url: draft.value.url,
          posX: draft.value.posX,
          posY: draft.value.posY,
        },
      });
    }
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadCoverImage(file);
      setDraft({
        ...draft,
        type: draft.type === 'combo' ? 'combo' : 'image',
        value: { ...draft.value, url },
      });
      toast.success('Imagem enviada');
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha no upload');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    try {
      await update.mutateAsync(draft);
      toast.success('Capa atualizada');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao salvar');
    }
  };

  const imageMode: 'image' | 'combo' = draft.type === 'combo' ? 'combo' : 'image';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden gap-0">
        <Tabs value={tab} onValueChange={onTabChange} className="flex flex-col flex-1 overflow-hidden">
        <div className="px-6 pt-6 pb-3 border-b space-y-3 shrink-0">
          <DialogHeader>
            <DialogTitle>Personalizar capa</DialogTitle>
          </DialogHeader>




        {/* Preview */}
        {(() => {
          const draggable = !!resolved.imageUrl;
          const onDown = (clientX: number, clientY: number) => {
            if (!draggable) return;
            dragStart.current = {
              x: clientX,
              y: clientY,
              posX: typeof draft.value.posX === 'number' ? draft.value.posX : 50,
              posY: typeof draft.value.posY === 'number' ? draft.value.posY : 50,
            };
            setDragging(true);
          };
          const onMove = (clientX: number, clientY: number) => {
            if (!dragStart.current || !previewRef.current) return;
            const rect = previewRef.current.getBoundingClientRect();
            const dx = ((clientX - dragStart.current.x) / rect.width) * 100;
            const dy = ((clientY - dragStart.current.y) / rect.height) * 100;
            const posX = Math.max(0, Math.min(100, dragStart.current.posX - dx));
            const posY = Math.max(0, Math.min(100, dragStart.current.posY - dy));
            setDraft((d) => ({ ...d, value: { ...d.value, posX, posY } }));
          };
          const onUp = () => { dragStart.current = null; setDragging(false); };
          return (
            <div
              ref={previewRef}
              className={cn(
                'relative w-full aspect-[5/1] rounded-xl overflow-hidden border select-none',
                draggable && (dragging ? 'cursor-grabbing' : 'cursor-grab'),
              )}
              style={{ background: resolved.base ?? '#1E40AF' }}
              onMouseDown={(e) => onDown(e.clientX, e.clientY)}
              onMouseMove={(e) => dragging && onMove(e.clientX, e.clientY)}
              onMouseUp={onUp}
              onMouseLeave={onUp}
              onTouchStart={(e) => { const t = e.touches[0]; onDown(t.clientX, t.clientY); }}
              onTouchMove={(e) => { if (!dragging) return; const t = e.touches[0]; onMove(t.clientX, t.clientY); }}
              onTouchEnd={onUp}
            >
              {resolved.imageUrl && (
                <div
                  className="absolute inset-0 bg-no-repeat pointer-events-none"
                  style={{
                    backgroundImage: `url(${resolved.imageUrl})`,
                    backgroundPosition: resolved.backgroundPosition ?? 'center',
                    backgroundSize: resolved.backgroundSize ?? 'cover',
                  }}
                  draggable={false}
                />
              )}
              {resolved.overlay && (
                <div className="absolute inset-0 pointer-events-none" style={{ background: resolved.overlay }} />
              )}
              <div className="relative h-full flex items-center justify-between px-5 text-white font-semibold pointer-events-none">
                <span>Pré-visualização</span>
                {draggable && !dragging && (
                  <span className="flex items-center gap-1 text-[11px] font-medium bg-black/30 backdrop-blur px-2 py-1 rounded-md">
                    <Move className="h-3 w-3" /> Arraste para ajustar
                  </span>
                )}
              </div>
            </div>
          );
        })()}

          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="preset">Presets</TabsTrigger>
            <TabsTrigger value="color">Cor</TabsTrigger>
            <TabsTrigger value="gradient">Degradê</TabsTrigger>
            <TabsTrigger value="image">Imagem</TabsTrigger>
            <TabsTrigger value="kpi" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">
              <LayoutGrid className="h-3.5 w-3.5" /> KPI
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">



          <TabsContent value="preset" className="pt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {COVER_PRESETS.map((p) => {
                const active = draft.value.preset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (presetGradientOn) {
                        setDraft({
                          ...draft,
                          type: 'combo',
                          value: {
                            ...draft.value,
                            preset: p.id,
                            url: p.url,
                          },
                        });
                      } else {
                        setDraft({ ...draft, type: 'preset', value: { preset: p.id, plain: true } });
                      }
                    }}
                    className={cn(
                      'relative h-20 rounded-lg overflow-hidden border-2 transition',
                      active ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30',
                    )}
                    style={{ backgroundImage: `url(${p.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  >
                    <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${p.from}cc 0%, transparent 100%)` }} />
                    <span className="absolute bottom-1 left-2 text-[10px] font-semibold text-white drop-shadow">{p.label}</span>
                    {active && <Check className="absolute top-1 right-1 h-4 w-4 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>

            {/* Degradê sobre o preset */}
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Label className="text-xs font-semibold">Aplicar degradê azul sobre a imagem</Label>
                  <p className="text-[11px] text-muted-foreground">
                    {presetGradientOn
                      ? 'Adiciona um overlay azul para destacar textos sobre a imagem.'
                      : 'Somente imagem — sem nenhum overlay azul aplicado.'}
                  </p>
                </div>
                <Switch
                  checked={presetGradientOn}
                  onCheckedChange={(checked) => {
                    const pid = draft.value.preset ?? 'unig-default';
                    if (checked) {
                      const preset = getPresetById(pid);
                      const g = GRADIENT_PRESETS[0];
                      setDraft({
                        ...draft,
                        type: 'combo',
                        value: {
                          preset: pid,
                          url: preset.url,
                          from: draft.value.from ?? g.from,
                          to: draft.value.to ?? g.to,
                          angle: draft.value.angle ?? g.angle,
                          posX: draft.value.posX,
                          posY: draft.value.posY,
                        },
                      });
                    } else {
                      setDraft({
                        ...draft,
                        type: 'preset',
                        value: { preset: pid, plain: true, posX: draft.value.posX, posY: draft.value.posY },
                      });
                    }
                  }}
                />
              </div>

              {presetGradientOn && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {GRADIENT_PRESETS.map((g, i) => {
                      const active = draft.value.from === g.from && draft.value.to === g.to && draft.value.angle === g.angle;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setDraft({ ...draft, type: 'combo', value: { ...draft.value, from: g.from, to: g.to, angle: g.angle } })}
                          className={cn('h-12 rounded-md border-2 transition relative', active ? 'border-primary ring-2 ring-primary/30' : 'border-transparent')}
                          style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }}
                          title={g.label}
                        >
                          <span className="absolute bottom-0.5 left-1 text-[9px] font-semibold text-white drop-shadow">{g.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <Label className="text-xs">Ângulo: {draft.value.angle ?? 90}°</Label>
                    <Slider value={[draft.value.angle ?? 90]} min={0} max={360} step={15}
                      onValueChange={(v) => setDraft({ ...draft, type: 'combo', value: { ...draft.value, angle: v[0] } })} className="pt-3" />
                  </div>
                  <div>
                    <Label className="text-xs">Intensidade do azul: {Math.round(draft.overlay * 100)}%</Label>
                    <Slider value={[draft.overlay]} min={0} max={1} step={0.05}
                      onValueChange={(v) => setDraft({ ...draft, overlay: v[0] })} className="pt-3" />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>


          <TabsContent value="color" className="pt-4 space-y-3">
            <div className="grid grid-cols-10 gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => setDraft({ ...draft, type: 'color', value: { color: c } })}
                  className={cn(
                    'h-10 rounded-md border-2 transition',
                    draft.value.color === c ? 'border-foreground' : 'border-transparent hover:scale-105',
                  )}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </TabsContent>


          <TabsContent value="gradient" className="pt-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {GRADIENT_PRESETS.map((g, i) => {
                const active = draft.value.from === g.from && draft.value.to === g.to;
                return (
                  <button
                    key={i}
                    onClick={() => setDraft({ ...draft, type: 'gradient', value: { ...g } })}
                    className={cn('h-16 rounded-lg border-2 transition relative', active ? 'border-primary ring-2 ring-primary/30' : 'border-transparent')}
                    style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }}
                  >
                    <span className="absolute bottom-1 left-2 text-[10px] font-semibold text-white drop-shadow">{g.label}</span>
                  </button>
                );
              })}
            </div>
            <div>
              <Label className="text-xs">Ângulo: {draft.value.angle ?? 135}°</Label>
              <Slider value={[draft.value.angle ?? 135]} min={0} max={360} step={15}
                onValueChange={(v) => setDraft({ ...draft, type: 'gradient', value: { ...draft.value, angle: v[0] } })} className="pt-3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {(['from', 'to'] as const).map((key) => (
                <div key={key}>
                  <Label className="text-xs font-semibold">
                    {key === 'from' ? 'Cor inicial (De)' : 'Cor final (Para)'}
                  </Label>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {BLUE_PALETTE.map((c) => {
                      const active = draft.value[key] === c.value;
                      const isDefault = c.value === SIDEBAR_BLUE;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          title={c.label + (isDefault ? ' — mesmo do botão Padrão' : '')}
                          onClick={() => setDraft({ ...draft, type: 'gradient', value: { ...draft.value, [key]: c.value } })}
                          className={cn(
                            'relative h-9 rounded-md border-2 transition',
                            active ? 'border-foreground ring-2 ring-primary/30' : 'border-transparent hover:scale-105',
                          )}
                          style={{ background: c.value }}
                          aria-label={c.label}
                        >
                          {isDefault && (
                            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-primary whitespace-nowrap">
                              Padrão
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="h-3" />



          </TabsContent>

          <TabsContent value="image" className="pt-4 space-y-3">
            <label className="flex items-center justify-center gap-2 h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <span className="text-sm">{uploading ? 'Enviando...' : 'Clique para enviar sua imagem'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>

            <div className="rounded-md border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Dimensões recomendadas para a capa</p>
              <p>• Mínimo: <b>1920 × 500 px</b> (proporção aproximada 4:1)</p>
              <p>• Ideal: <b>2560 × 640 px</b> (alta qualidade, telas retina/4K)</p>
              <p>• Prefira imagens <b>horizontais/panorâmicas</b> — a capa é larga e baixa, então fotos verticais ou com detalhes nas bordas serão cortadas.</p>
              <p>• Formatos: JPG, PNG ou WEBP (recomendado até 2 MB).</p>
            </div>

            {draft.value.url && (
              <div className="flex items-center gap-3 p-2 rounded-md border bg-muted/30 min-w-0">
                <div
                  className="h-12 w-20 rounded bg-cover bg-center flex-shrink-0 border"
                  style={{ backgroundImage: `url(${draft.value.url})` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">Imagem enviada</p>
                  <p className="text-[11px] text-muted-foreground truncate">{draft.value.url.split('/').pop()}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraft({ ...draft, value: { ...draft.value, url: undefined } })}
                >
                  Remover
                </Button>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">Use a Pré-visualização acima para arrastar e ajustar o enquadramento.</p>

            {/* Sub-toggle: Modo de fundo */}
            <div>
              <Label className="text-xs font-semibold">Modo de fundo</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setImageMode('image')}
                  className={cn(
                    'h-10 rounded-md border-2 text-xs font-medium transition',
                    imageMode === 'image' ? 'border-primary bg-primary/10 text-primary' : 'border-muted hover:border-muted-foreground/40',
                  )}
                >
                  Somente imagem
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('combo')}
                  className={cn(
                    'h-10 rounded-md border-2 text-xs font-medium transition',
                    imageMode === 'combo' ? 'border-primary bg-primary/10 text-primary' : 'border-muted hover:border-muted-foreground/40',
                  )}
                >
                  Imagem + degradê
                </button>
              </div>
            </div>

            {imageMode === 'combo' && (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {GRADIENT_PRESETS.map((g, i) => {
                    const active = draft.value.from === g.from && draft.value.to === g.to && draft.value.angle === g.angle;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setDraft({ ...draft, type: 'combo', value: { ...draft.value, from: g.from, to: g.to, angle: g.angle } })}
                        className={cn('h-12 rounded-md border-2 transition relative', active ? 'border-primary ring-2 ring-primary/30' : 'border-transparent')}
                        style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }}
                        title={g.label}
                      >
                        <span className="absolute bottom-0.5 left-1 text-[9px] font-semibold text-white drop-shadow">{g.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div>
                  <Label className="text-xs">Ângulo: {draft.value.angle ?? 90}°</Label>
                  <Slider value={[draft.value.angle ?? 90]} min={0} max={360} step={15}
                    onValueChange={(v) => setDraft({ ...draft, type: 'combo', value: { ...draft.value, angle: v[0] } })} className="pt-3" />
                </div>

              </div>
            )}

            <div>
              <Label className="text-xs">Intensidade do azul: {Math.round(draft.overlay * 100)}%</Label>
              <Slider value={[draft.overlay]} min={0} max={1} step={0.05}
                onValueChange={(v) => setDraft({ ...draft, overlay: v[0] })} className="pt-3" />
            </div>
          </TabsContent>

          <TabsContent value="kpi" className="pt-4 space-y-3">
            <div>
              <Label className="text-sm font-semibold">Cards de KPI</Label>
              <p className="text-[11px] text-muted-foreground mb-3">
                Escolha o estilo visual dos 4 cards exibidos sobre a capa. "Multicolor" usa cores fixas; "Personalizar cores" deixa você escolher uma cor por card.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {KPI_ACCENT_OPTIONS.map((opt) => {
                  const active = draft.kpiAccent === opt.id;
                  const items: { label: string; value: number; Icon: any; slot: KpiSlot }[] = [
                    { label: 'Em andamento', value: 12, Icon: Clock, slot: 'blue' },
                    { label: 'Finalizadas', value: 87, Icon: CheckCircle2, slot: 'emerald' },
                    { label: 'Aguardando', value: 3, Icon: Hourglass, slot: 'orange' },
                    { label: 'Total de CIs', value: 102, Icon: ClipboardList, slot: 'violet' },
                  ];
                  const dark = opt.textOnDark !== false && opt.id !== 'white';
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft({ ...draft, kpiAccent: opt.id as KpiAccent })}
                      className={cn(
                        'rounded-xl border-2 p-2 transition text-left',
                        active ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30',
                      )}
                      style={{
                        background: 'linear-gradient(135deg, hsl(211 89% 22%), hsl(217 91% 35%))',
                      }}
                      aria-label={opt.label}
                    >
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[11px] font-semibold text-white drop-shadow">{opt.label}</span>
                        {active && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {items.map((it) => {
                          // Resolve por-card colors quando multi/custom
                          const toneId: KpiToneId | undefined =
                            opt.id === 'multi'
                              ? KPI_MULTI_DEFAULT[it.slot]
                              : opt.id === 'custom'
                              ? (draft.kpiCustomTones?.[it.slot] ?? KPI_MULTI_DEFAULT[it.slot])
                              : undefined;
                          const tonePreset = toneId ? getTone(toneId) : null;
                          const bg = tonePreset ? `${tonePreset.swatch}99` : opt.previewBg;
                          const border = tonePreset ? `${tonePreset.swatch}` : opt.previewBorder;
                          return (
                            <div
                              key={it.label}
                              className={cn(
                                'rounded-md px-1.5 py-1 border',
                                opt.id === 'glass' && 'backdrop-blur-sm',
                              )}
                              style={{
                                background: bg,
                                borderColor: border,
                                color: dark || tonePreset ? '#fff' : '#1E40AF',
                              }}
                            >
                              <it.Icon className="h-3 w-3 mb-0.5 opacity-80" />
                              <div className="text-[8px] font-semibold uppercase tracking-wide leading-none truncate opacity-90">
                                {it.label}
                              </div>
                              <div className="text-[11px] font-bold leading-tight">{it.value}</div>
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {draft.kpiAccent === 'multi' && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-[11px] text-muted-foreground">
                  Cada card recebe uma cor fixa: <b>Azul</b> (Em andamento), <b>Verde</b> (Finalizadas), <b>Laranja</b> (Aguardando), <b>Roxo</b> (Total de CIs).
                </p>
              </div>
            )}

            {draft.kpiAccent === 'custom' && (
              <div className="rounded-lg border p-3 space-y-3">
                <Label className="text-xs font-semibold">Cor por card</Label>
                {([
                  { slot: 'blue' as KpiSlot, label: 'Em andamento', Icon: Clock },
                  { slot: 'emerald' as KpiSlot, label: 'Finalizadas', Icon: CheckCircle2 },
                  { slot: 'orange' as KpiSlot, label: 'Aguardando', Icon: Hourglass },
                  { slot: 'violet' as KpiSlot, label: 'Total de CIs', Icon: ClipboardList },
                ]).map(({ slot, label, Icon }) => {
                  const currentTone = draft.kpiCustomTones?.[slot] ?? KPI_MULTI_DEFAULT[slot];
                  return (
                    <div key={slot} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-32 shrink-0">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">{label}</span>
                      </div>
                      <div className="flex-1 flex flex-wrap gap-1.5">
                        {KPI_TONE_PALETTE.map((t) => {
                          const isActive = currentTone === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              title={t.label}
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  kpiCustomTones: {
                                    ...KPI_MULTI_DEFAULT,
                                    ...(draft.kpiCustomTones || {}),
                                    [slot]: t.id,
                                  },
                                })
                              }
                              className={cn(
                                'h-7 w-7 rounded-md border-2 transition',
                                isActive ? 'border-foreground ring-2 ring-primary/30 scale-105' : 'border-transparent hover:scale-105',
                              )}
                              style={{ background: t.swatch }}
                              aria-label={t.label}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CTA Buttons style */}
            <div className="pt-2 border-t">
              <Label className="text-sm font-semibold">Estilo dos botões da capa</Label>
              <p className="text-[11px] text-muted-foreground mb-3">
                Define a aparência dos botões "Abrir nova CI" e "Minhas CIs" exibidos sobre a capa.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {CTA_STYLE_OPTIONS.map((opt) => {
                  const active = (draft.ctaStyle ?? 'glass') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft({ ...draft, ctaStyle: opt.id as CtaStyle })}
                      className={cn(
                        'rounded-xl border-2 p-2 transition text-left',
                        active ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30',
                      )}
                      style={{ background: 'linear-gradient(135deg, hsl(211 89% 22%), hsl(217 91% 35%))' }}
                      aria-label={opt.label}
                    >
                      <div className="flex items-center justify-between mb-2 px-0.5">
                        <span className="text-[11px] font-semibold text-white drop-shadow">{opt.label}</span>
                        {active && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className={cn('h-6 rounded-md flex items-center justify-center text-[9px] font-semibold truncate px-1', opt.primaryClass)}>
                          Abrir nova CI
                        </span>
                        <span className={cn('h-6 rounded-md flex items-center justify-center text-[9px] font-semibold truncate px-1', opt.secondaryClass)}>
                          Minhas CIs
                        </span>
                      </div>
                      <p className="text-[9px] text-white/70 mt-1.5 leading-tight">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </div>
        </Tabs>


        <DialogFooter className="gap-2 sm:gap-2 px-6 py-4 border-t shrink-0">

          <Button
            variant="outline"
            onClick={() => setDraft(DEFAULT_COVER)}
            title="Restaurar cor padrão (azul da sidebar)"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Padrão
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar capa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
