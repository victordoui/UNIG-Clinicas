export type Assessment = 'AV1' | 'AV2' | 'AV3' | 'REC';
export const ASSESSMENTS: Assessment[] = ['AV1', 'AV2', 'AV3', 'REC'];
export const ASSESSMENT_LABEL: Record<Assessment, string> = {
  AV1: 'AV1',
  AV2: 'AV2',
  AV3: 'AV3',
  REC: 'REC',
};

export type AttendanceStatus = 'present' | 'absent' | 'justified';
export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: 'Presente',
  absent: 'Ausente',
  justified: 'Justificada',
};
export const ATTENDANCE_BADGE: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  absent: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  justified: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
};

export interface GradeRow {
  id?: string;
  enrollment_id: string;
  assessment: Assessment;
  score: number | null;
  max_score?: number;
  weight?: number;
  released_at?: string | null;
}

export interface AttendanceRow {
  id?: string;
  enrollment_id: string;
  class_date: string;
  status: AttendanceStatus;
  hours?: number;
}

export type Situation = 'em_curso' | 'aprovado' | 'recuperacao' | 'reprovado' | 'reprovado_falta';

export const SITUATION_LABEL: Record<Situation, string> = {
  em_curso: 'Em curso',
  aprovado: 'Aprovado',
  recuperacao: 'Recuperação',
  reprovado: 'Reprovado',
  reprovado_falta: 'Reprovado por falta',
};

export const SITUATION_BADGE: Record<Situation, string> = {
  em_curso: 'bg-muted text-muted-foreground border-border',
  aprovado: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  recuperacao: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  reprovado: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  reprovado_falta: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
};

/** Weighted average of AV1/AV2/AV3 (ignores null). Returns null if all null. */
export function computeAverage(grades: GradeRow[]): number | null {
  const core = grades.filter((g) => g.assessment !== 'REC' && g.score != null);
  if (core.length === 0) return null;
  let sum = 0, w = 0;
  core.forEach((g) => {
    const weight = g.weight ?? 1;
    sum += (g.score as number) * weight;
    w += weight;
  });
  const avg = w > 0 ? sum / w : null;
  if (avg == null) return null;
  const rec = grades.find((g) => g.assessment === 'REC' && g.score != null);
  return rec ? Math.max(avg, rec.score as number) : avg;
}

/** Frequency percent 0-100. Considers 'present' and 'justified' as counted for freq (justified doesn't count as absence). */
export function computeFrequency(records: AttendanceRow[]): number | null {
  if (records.length === 0) return null;
  const total = records.length;
  const absences = records.filter((r) => r.status === 'absent').length;
  return ((total - absences) / total) * 100;
}

export function computeSituation(
  grades: GradeRow[],
  attendance: AttendanceRow[],
  opts?: { hasAllCoreGrades?: boolean },
): Situation {
  const avg = computeAverage(grades);
  const freq = computeFrequency(attendance);
  const hasAll = opts?.hasAllCoreGrades ?? (['AV1', 'AV2', 'AV3'] as Assessment[]).every((a) =>
    grades.some((g) => g.assessment === a && g.score != null),
  );

  if (freq != null && freq < 75) return 'reprovado_falta';
  if (!hasAll || avg == null) return 'em_curso';
  if (avg >= 6) return 'aprovado';
  if (avg >= 4) return 'recuperacao';
  return 'reprovado';
}

export function formatScore(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return (Math.round(n * 10) / 10).toFixed(1);
}
