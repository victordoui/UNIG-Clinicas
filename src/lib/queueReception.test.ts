import { describe, expect, it } from "vitest";
import {
  canRecallReceptionTicket,
  formatReceptionClinicLabel,
  getActiveReceptionClinicId,
} from "./queueReception";

describe("operação de recepção", () => {
  const scopes = [
    { clinic_id: "clinic-odonto", clinic: { code: "ODONTO" } },
    { clinic_id: "clinic-vet", clinic: { code: "VET" } },
  ];

  it("carrega a clínica ativa mesmo quando a conta possui mais de um escopo", () => {
    expect(getActiveReceptionClinicId(scopes, "vet")).toBe("clinic-vet");
    expect(getActiveReceptionClinicId(scopes, " ODONTO ")).toBe("clinic-odonto");
  });

  it("não escolhe uma clínica quando o escopo ativo não é válido", () => {
    expect(getActiveReceptionClinicId(scopes, "FISIO")).toBeNull();
    expect(getActiveReceptionClinicId(scopes, null)).toBeNull();
  });

  it("só permite rechamar uma senha ativa", () => {
    expect(canRecallReceptionTicket("called")).toBe(true);
    expect(canRecallReceptionTicket("checked_in")).toBe(true);
    expect(canRecallReceptionTicket("in_service")).toBe(true);
    expect(canRecallReceptionTicket("waiting")).toBe(false);
    expect(canRecallReceptionTicket("completed")).toBe(false);
  });

  it("identifica a clínica ativa sem assumir uma especialidade", () => {
    expect(formatReceptionClinicLabel(" vet ")).toBe("Clínica · VET");
    expect(formatReceptionClinicLabel(null)).toBe("Clínica não selecionada");
  });
});
