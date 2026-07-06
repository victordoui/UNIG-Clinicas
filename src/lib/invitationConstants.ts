export const INVITEE_TYPES = [
  { value: "visitante", label: "Visitante" },
  { value: "solicitante", label: "Solicitante" },
] as const;

export type InviteeTypeValue = typeof INVITEE_TYPES[number]["value"];

export const INVITEE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  INVITEE_TYPES.map((t) => [t.value, t.label])
);

export const INVITATION_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  active: "Ativo",
  registered: "Cadastrado",
  expired: "Expirado",
  cancelled: "Cancelado",
};

export const INVITATION_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  registered: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  expired: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};
