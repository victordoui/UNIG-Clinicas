import { Link } from 'react-router-dom';
import { Sparkles, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { CoverKpiCard, CoverKpiTone } from './CoverKpiCard';

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export interface RoleHomeKpi {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone: CoverKpiTone;
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
  kpis: RoleHomeKpi[];
}

export function RoleHomeCover({ chipLabel, chipIcon: ChipIcon = Sparkles, description, ctas = [], kpis }: RoleHomeCoverProps) {
  const { profile } = useAuth();
  const firstName = (profile?.full_name || profile?.email || 'Usuário').split(' ')[0];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border shadow-sm"
      style={{
        background:
          'linear-gradient(135deg, hsl(211 89% 35%) 0%, hsl(211 89% 45%) 45%, hsl(211 89% 55%) 100%)',
      }}
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.25) 0%, transparent 45%)' }} />
      <div className="relative pt-5 px-4 pb-4 lg:px-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 xl:gap-6 min-w-0">
          <div className="space-y-3 max-w-xl min-w-0 flex-1">
            <div
              className="flex items-center gap-1.5 text-white text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
            >
              <ChipIcon className="h-3.5 w-3.5" />
              {chipLabel}
            </div>
            <h1
              className="text-2xl lg:text-4xl font-bold tracking-tight text-white leading-tight"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              {greet()}, {firstName} 👋
            </h1>
            <p className="text-white/95 text-[13px] lg:text-[14px] leading-snug" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {description}
            </p>

            {ctas.length > 0 && (
              <div className="flex flex-row flex-wrap gap-2 pt-1">
                {ctas.map((c, idx) => {
                  const isPrimary = c.primary ?? idx === 0;
                  const Icon = c.icon;
                  return (
                    <Link key={c.to + c.label} to={c.to}>
                      <Button
                        size="sm"
                        className={cn(
                          'whitespace-nowrap',
                          isPrimary
                            ? 'bg-white text-primary hover:bg-white/90'
                            : 'bg-white/15 text-white border border-white/30 hover:bg-white/25',
                        )}
                        variant={isPrimary ? 'default' : 'outline'}
                      >
                        <Icon className="h-4 w-4 mr-1.5" /> {c.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {kpis.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 w-full xl:w-auto xl:min-w-[480px]">
              {kpis.slice(0, 4).map((k) => (
                <CoverKpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} tone={k.tone} to={k.to} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
