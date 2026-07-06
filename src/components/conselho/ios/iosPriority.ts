export type IOSPriority = 'alta' | 'media' | 'baixa' | 'neutra';

/** Deriva prioridade a partir dos dias desde a criação. */
export function derivePriorityFromAge(createdAt: string | Date): IOSPriority {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
  if (days >= 5) return 'alta';
  if (days >= 3) return 'media';
  if (days >= 0) return 'baixa';
  return 'neutra';
}

export const PRIORITY_LABEL: Record<IOSPriority, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
  neutra: 'Neutra',
};

export const PRIORITY_SHORT: Record<IOSPriority, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
  neutra: '—',
};
