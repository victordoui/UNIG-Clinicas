// Máscaras de input para campos brasileiros.

/** Mantém só dígitos. */
export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D+/g, '');
}

/** Mantém apenas letras (incluindo acentos pt-BR), espaços, hífens e apóstrofos. */
export function onlyLetters(value: string | null | undefined): string {
  return (value ?? '').replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'\-]/g, '');
}

/**
 * Formata telefone BR como (XX) XXXXX-XXXX (celular) ou (XX) XXXX-XXXX (fixo).
 * Aceita entradas parciais e formata progressivamente para uso em inputs controlados.
 */
export function formatPhoneBR(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Retorna apenas os dígitos do telefone (útil para wa.me / tel:). */
export function phoneDigits(value: string | null | undefined): string {
  return onlyDigits(value);
}

/** Monta link do WhatsApp; assume DDI 55 quando ausente. */
export function whatsappLink(value: string | null | undefined): string | null {
  const d = onlyDigits(value);
  if (d.length < 10) return null;
  const withDdi = d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${withDdi}`;
}
