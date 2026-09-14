export function normalizeGuestPhone(value: string) {
  return value.replace(/\D/g, "");
}

export function validateOptionalGuestEmail(value: string) {
  const email = value.trim();
  if (!email) return null;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
    ? null
    : "Informe um e-mail válido ou deixe o campo em branco.";
}

export function validateGuestQueueEntry(input: {
  fullName: string;
  phone: string;
  consent: boolean;
  email?: string;
}) {
  if (input.fullName.trim().split(/\s+/).filter(Boolean).length < 2) return "Informe nome e sobrenome.";
  if (normalizeGuestPhone(input.phone).length < 10) return "Informe um celular com DDD.";
  const emailError = validateOptionalGuestEmail(input.email ?? "");
  if (emailError) return emailError;
  if (!input.consent) return "Confirme a finalidade administrativa dos dados para entrar na fila.";
  return null;
}
