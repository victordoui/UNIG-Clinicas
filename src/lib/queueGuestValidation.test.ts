import { describe, expect, it } from "vitest";
import { normalizeGuestPhone, validateGuestQueueEntry, validateOptionalGuestEmail } from "./queueGuestValidation";

describe("entrada de visitante na fila", () => {
  it("normaliza telefone brasileiro", () => expect(normalizeGuestPhone("(21) 99999-1234")).toBe("21999991234"));
  it("exige nome completo, celular e consentimento", () => {
    expect(validateGuestQueueEntry({ fullName: "Ana", phone: "21999991234", consent: true })).toBe("Informe nome e sobrenome.");
    expect(validateGuestQueueEntry({ fullName: "Ana Silva", phone: "999", consent: true })).toBe("Informe um celular com DDD.");
    expect(validateGuestQueueEntry({ fullName: "Ana Silva", phone: "21999991234", consent: false })).toBe("Confirme a finalidade administrativa dos dados para entrar na fila.");
  });
  it("aceita uma entrada mínima válida", () => expect(validateGuestQueueEntry({ fullName: "Ana Silva", phone: "(21) 99999-1234", consent: true })).toBeNull());
  it("aceita e-mail opcional válido e recusa formato inválido antes da RPC", () => {
    expect(validateOptionalGuestEmail("")).toBeNull();
    expect(validateOptionalGuestEmail("ana.silva@exemplo.com")).toBeNull();
    expect(validateGuestQueueEntry({ fullName: "Ana Silva", phone: "21999991234", consent: true, email: "ana@invalido" })).toBe("Informe um e-mail válido ou deixe o campo em branco.");
  });
});
