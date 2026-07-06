import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineStep } from '@/hooks/usePurchasePipeline';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  steps: PipelineStep[];
  className?: string;
}

const STATE_STYLES: Record<PipelineStep['state'], { dot: string; line: string; label: string }> = {
  done: {
    dot: 'bg-emerald-500 text-white border-emerald-500',
    line: 'bg-emerald-500',
    label: 'text-emerald-700',
  },
  current: {
    dot: 'bg-primary text-primary-foreground border-primary ring-4 ring-primary/20',
    line: 'bg-muted',
    label: 'text-primary font-semibold',
  },
  future: {
    dot: 'bg-card text-muted-foreground border-border',
    line: 'bg-muted',
    label: 'text-muted-foreground',
  },
  rejected: {
    dot: 'bg-destructive text-destructive-foreground border-destructive',
    line: 'bg-muted',
    label: 'text-destructive font-semibold',
  },
};

export function PipelineStepper({ steps, className }: Props) {
  return (
    <TooltipProvider delayDuration={150}>
      {/* Desktop */}
      <div className={cn('hidden md:flex items-start justify-between gap-1 w-full', className)}>
        {steps.map((step, idx) => {
          const styles = STATE_STYLES[step.state];
          const isLast = idx === steps.length - 1;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative min-w-0">
              <div className="flex items-center w-full">
                <div className={cn('flex-1 h-1 rounded-full', idx === 0 ? 'opacity-0' : (steps[idx - 1].state === 'done' ? 'bg-emerald-500' : 'bg-muted'))} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        'h-10 w-10 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-shadow',
                        styles.dot,
                      )}
                    >
                      {step.state === 'done' ? <Check className="h-4 w-4" />
                        : step.state === 'rejected' ? <X className="h-4 w-4" />
                        : idx + 1}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{step.label}</p>
                    {step.responsible && <p className="text-xs text-muted-foreground">{step.responsible}</p>}
                    {step.at && <p className="text-xs text-muted-foreground">{new Date(step.at).toLocaleString('pt-BR')}</p>}
                  </TooltipContent>
                </Tooltip>
                <div className={cn('flex-1 h-1 rounded-full', isLast ? 'opacity-0' : (step.state === 'done' ? 'bg-emerald-500' : 'bg-muted'))} />
              </div>
              <span className={cn('mt-2 text-xs text-center truncate w-full px-1', styles.label)}>{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Mobile vertical */}
      <ol className={cn('md:hidden space-y-3', className)}>
        {steps.map((step, idx) => {
          const styles = STATE_STYLES[step.state];
          return (
            <li key={step.key} className="flex items-start gap-3">
              <div className={cn('h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0', styles.dot)}>
                {step.state === 'done' ? <Check className="h-3.5 w-3.5" />
                  : step.state === 'rejected' ? <X className="h-3.5 w-3.5" />
                  : idx + 1}
              </div>
              <div className="flex-1">
                <div className={cn('text-sm', styles.label)}>{step.label}</div>
                {step.at && <div className="text-xs text-muted-foreground">{new Date(step.at).toLocaleString('pt-BR')}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </TooltipProvider>
  );
}
