export type ReceptionScope = {
  clinic_id: string;
  clinic?: { code?: string | null } | null;
};

const RECALLABLE_TICKET_STATUSES = new Set([
  "called",
  "checked_in",
  "in_service",
]);

const QUEUE_PREFIX_BY_CLINIC: Record<string, string> = {
  ODONTO: "O",
  FISIO: "F",
  VET: "V",
  ESTETICA: "E",
};

/** Returns only the scope selected in the application, never an arbitrary clinic. */
export function getActiveReceptionClinicId(
  scopes: ReceptionScope[] | null | undefined,
  activeClinicCode: string | null | undefined,
) {
  const normalizedCode = activeClinicCode?.trim().toUpperCase();
  if (!normalizedCode) return null;

  return (
    scopes?.find(
      (scope) => scope.clinic?.code?.trim().toUpperCase() === normalizedCode,
    )?.clinic_id ?? null
  );
}

/** Mirrors the database contract for recall_reception_ticket. */
export function canRecallReceptionTicket(status: string | null | undefined) {
  return Boolean(status && RECALLABLE_TICKET_STATUSES.has(status));
}

/** A safe, truthful label when the session only exposes the active clinic code. */
export function formatReceptionClinicLabel(activeClinicCode: string | null | undefined) {
  const code = activeClinicCode?.trim().toUpperCase();
  return code ? `Clínica · ${code}` : "Clínica não selecionada";
}

/** Formats a ticket only for display; the database ticket number remains authoritative. */
export function formatQueueTicketCode(
  activeClinicCode: string | null | undefined,
  ticketNumber: number,
) {
  const clinicCode = activeClinicCode?.trim().toUpperCase() ?? "";
  const prefix = QUEUE_PREFIX_BY_CLINIC[clinicCode] ?? "S";
  return `${prefix}-${String(ticketNumber).padStart(3, "0")}`;
}
