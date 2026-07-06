import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CoverBanner } from '@/components/profile/CoverBanner';
import { CoverEditor } from '@/components/profile/CoverEditor';
import { useProfileCover } from '@/hooks/useProfileCover';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { getCtaStyle, KpiSlot, KpiToneId } from '@/lib/coverPresets';
import { CoverKpiCard } from './CoverKpiCard';

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export interface RoleHomeKpi {
  label: string;
  subtitle?: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone: KpiSlot;
  customTone?: KpiToneId;
  to?: string;
}

export interface RoleHomeCta {
  label: string;
  icon: LucideIcon;
  to: string;
  primary?: boolean;
}

interface RoleHomeCoverProps {
  chipLabel: string;
  chipIcon?: LucideIcon;
  description: string;
  ctas?: RoleHomeCta[];
  kpis: RoleHomeKpi[]; // 1–4 (recomendado 4)
}

/**
 * Capa unificada de página inicial — mesmo visual da capa validada
 * no Portal do Solicitante (CIPublicHome). Suporta personalização via
 * CoverEditor (foto, presets, acentos), saudação automática, CTAs
 * e até 4 KPIs coloridos.
 */
export function RoleHomeCover({ chipLabel, chipIcon: ChipIcon = Sparkles, description, ctas = [], kpis }: RoleHomeCoverProps) {
  const { profile } = useAuth();
  const { state: cover } = useProfileCover();
  const [editorOpen, setEditorOpen] = useState(false);

  const firstName = (profile?.full_name || profile?.email || 'Usuário').split(' ')[0];
  const ctaStyles = getCtaStyle(cover.ctaStyle);

  return (
    <>
      <CoverBanner cover={cover} onEdit={() => setEditorOpen(true)}>
        <div className="pt-4 px-4 pb-3 lg:pt-5 lg:px-6 lg:pb-4">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 xl:gap-6 min-w-0">
            {/* Esquerda: texto + CTAs */}
            <div className="relative space-y-3 max-w-xl min-w-0 flex-1">
              <div
                className="flex items-center gap-2 text-white text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 2px 10px rgba(0,0,0,0.45)' }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ChipIcon className="h-3.5 w-3.5" /> {chipLabel}
                </span>
              </div>
              <h1
                className="text-2xl lg:text-4xl font-bold tracking-tight text-white leading-tight"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7), 0 3px 14px rgba(0,0,0,0.5)' }}
              >
                {greet()}, {firstName} 👋
              </h1>
              <p
                className="text-white/95 text-[13px] lg:text-[14px] leading-snug"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 2px 10px rgba(0,0,0,0.45)' }}
              >
                {description}
              </p>

              {ctas.length > 0 && (
                <div className="flex flex-row flex-wrap gap-2 sm:gap-3">
                  {ctas.map((c, idx) => {
                    const isPrimary = c.primary ?? idx === 0;
                    const Icon = c.icon;
                    return (
                      <Link key={c.to + c.label} to={c.to} className="flex-1 sm:flex-none">
                        <Button
                          size="sm"
                          variant={isPrimary ? 'default' : 'outline'}
                          className={cn(
                            'w-full sm:w-auto whitespace-nowrap',
                            isPrimary ? ctaStyles.primaryClass : ctaStyles.secondaryClass,
                          )}
                        >
                          <Icon className="h-4 w-4 mr-1.5" /> {c.label}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Direita: até 4 KPIs */}
            {kpis.length > 0 && (
              <TooltipProvider delayDuration={150}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 w-full xl:w-auto xl:min-w-[480px] xl:max-w-[560px] min-w-0">
                  {kpis.slice(0, 4).map((k) => (
                    <CoverKpiCard
                      key={k.label}
                      label={k.label}
                      subtitle={k.subtitle ?? k.label}
                      value={k.value}
                      icon={k.icon}
                      accent={cover.kpiAccent}
                      tone={k.tone}
                      customTone={k.customTone ?? cover.kpiCustomTones?.[k.tone]}
                      to={k.to}
                    />
                  ))}
                </div>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CoverBanner>

      <CoverEditor open={editorOpen} onOpenChange={setEditorOpen} />
    </>
  );
}
