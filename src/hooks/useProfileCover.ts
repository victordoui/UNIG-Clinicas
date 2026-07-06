import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getPresetById, SIDEBAR_BLUE, KpiAccent, KpiSlot, KpiToneId, KPI_MULTI_DEFAULT, CtaStyle } from '@/lib/coverPresets';
import { useMemo } from 'react';

export type CoverType = 'preset' | 'color' | 'gradient' | 'image' | 'combo';
export type CoverValue = {
  preset?: string;
  color?: string;
  from?: string;
  to?: string;
  angle?: number;
  url?: string;
  posX?: number; // 0-100
  posY?: number; // 0-100
  plain?: boolean; // preset sem degradê/overlay (somente imagem)
  zoom?: number;   // 1.0 - 2.5 (escala da imagem, mantém aspect ratio)
};

export type CoverState = {
  type: CoverType;
  value: CoverValue;
  overlay: number;
  kpiAccent: KpiAccent;
  kpiCustomTones?: Partial<Record<KpiSlot, KpiToneId>>;
  ctaStyle: CtaStyle;
};

export function resolveCoverStyle(state: CoverState): {
  base?: string;
  imageUrl?: string;
  overlay?: string;
  backgroundPosition?: string;
  backgroundSize?: string;
} {
  const { type, value, overlay } = state;
  const overlayPct = Math.round(((1 - overlay) * 100));
  const posX = typeof value.posX === 'number' ? value.posX : 50;
  const posY = typeof value.posY === 'number' ? value.posY : 50;
  const backgroundPosition = `${posX}% ${posY}%`;
  const backgroundSize = 'cover';

  switch (type) {
    case 'color':
      return { base: value.color ?? SIDEBAR_BLUE };
    case 'gradient': {
      const angle = value.angle ?? 135;
      return {
        base: `linear-gradient(${angle}deg, ${value.from ?? SIDEBAR_BLUE}, ${value.to ?? '#3B82F6'})`,
      };
    }
    case 'image': {
      const ov = overlay;
      return {
        imageUrl: value.url,
        backgroundPosition,
        backgroundSize,
        overlay: `linear-gradient(180deg, rgba(15,23,42,${ov * 0.4}) 0%, rgba(15,23,42,${ov * 0.25}) 100%)`,
      };
    }
    case 'combo': {
      const ov = overlay;
      return {
        base: `linear-gradient(${value.angle ?? 90}deg, ${value.from ?? SIDEBAR_BLUE} 0%, ${value.from ?? SIDEBAR_BLUE} 15%, transparent 60%)`,
        imageUrl: value.url,
        backgroundPosition,
        backgroundSize,
        overlay: `linear-gradient(180deg, rgba(15,23,42,${ov * 0.35}) 0%, rgba(15,23,42,${ov * 0.2}) 100%)`,
      };
    }
    case 'preset':
    default: {
      const p = getPresetById(value.preset);
      if (value.plain) {
        return { imageUrl: p.url, backgroundPosition, backgroundSize };
      }
      const ov = overlay;
      return {
        imageUrl: p.url,
        backgroundPosition,
        backgroundSize,
        overlay: `linear-gradient(180deg, rgba(15,23,42,${ov * 0.35}) 0%, rgba(15,23,42,${ov * 0.2}) 100%)`,
      };
    }
  }
}

export function useProfileCover() {
  const { profile, refreshProfile } = useAuth() as any;
  const qc = useQueryClient();

  const state: CoverState = useMemo(() => {
    const hasCustom = !!profile?.cover_type;
    return {
      type: hasCustom ? (profile.cover_type as CoverType) : 'color',
      value: hasCustom
        ? ((profile?.cover_value as CoverValue) || {})
        : { color: SIDEBAR_BLUE },
      overlay: typeof profile?.cover_overlay === 'number' ? profile.cover_overlay : 0.35,
      kpiAccent: (profile?.cover_kpi_accent as KpiAccent) || 'glass',
      kpiCustomTones: (profile?.cover_kpi_tones as Partial<Record<KpiSlot, KpiToneId>>) || KPI_MULTI_DEFAULT,
      ctaStyle: (profile?.cover_cta_style as CtaStyle) || 'glass',
    };
  }, [profile]);

  const update = useMutation({
    mutationFn: async (patch: Partial<CoverState>) => {
      if (!profile?.id) throw new Error('Sem perfil');
      const next: CoverState = {
        type: patch.type ?? state.type,
        value: patch.value ?? state.value,
        overlay: patch.overlay ?? state.overlay,
        kpiAccent: patch.kpiAccent ?? state.kpiAccent,
        kpiCustomTones: patch.kpiCustomTones ?? state.kpiCustomTones,
        ctaStyle: patch.ctaStyle ?? state.ctaStyle,
      };
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          cover_type: next.type,
          cover_value: next.value,
          cover_overlay: next.overlay,
          cover_kpi_accent: next.kpiAccent,
          cover_kpi_tones: next.kpiCustomTones ?? null,
          cover_cta_style: next.ctaStyle,
          cover_updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (error) throw error;
      return next;
    },
    onSuccess: async () => {
      if (refreshProfile) await refreshProfile();
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  async function uploadCoverImage(file: File): Promise<string> {
    if (!profile?.id) throw new Error('Sem perfil');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${profile.id}/covers/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
    });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }

  return { state, update, uploadCoverImage };
}
