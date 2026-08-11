import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatOptionalNumber
} from "./format";
import { formatCategoryLabel, PT_BR_CATEGORY_LABELS } from "@/i18n/category-labels";

describe("locale formatting", () => {
  it("keeps BRL while respecting locale separators", () => {
    expect(formatCurrency(1234, "pt-BR")).toContain("R$");
    expect(formatCurrency(1234, "pt-BR")).toContain("1.234");
    expect(formatCurrency(1234, "en-US")).toContain("1,234");
  });

  it("formats dates using the selected locale", () => {
    expect(formatDate("2018-08-01", "pt-BR")).toMatch(/ago/i);
    expect(formatDate("2018-08-01", "en-US")).toMatch(/Aug/i);
  });

  it("does not present a missing metric as zero", () => {
    expect(formatOptionalNumber(null, "pt-BR", 2)).toBe("—");
  });

  it("uses reviewed Portuguese labels for every dataset category", () => {
    expect(Object.keys(PT_BR_CATEGORY_LABELS)).toHaveLength(74);
    expect(formatCategoryLabel("beleza_saude", "pt-BR")).toBe("Beleza e Saúde");
    expect(formatCategoryLabel("cama_mesa_banho", "pt-BR")).toBe("Cama, Mesa e Banho");
    expect(formatCategoryLabel("moveis_decoracao", "pt-BR")).toBe("Móveis e Decoração");
    expect(formatCategoryLabel("relogios_presentes", "pt-BR")).toBe("Relógios e Presentes");
    expect(formatCategoryLabel("informatica_acessorios", "pt-BR"))
      .toBe("Informática e Acessórios");
  });

  it("keeps English formatting and safely falls back for unknown Portuguese categories", () => {
    expect(formatCategoryLabel("health_beauty", "en-US")).toBe("Health Beauty");
    expect(formatCategoryLabel("agro_industry_and_commerce", "en-US"))
      .toBe("Agro Industry & Commerce");
    expect(formatCategoryLabel("categoria_futura", "pt-BR")).toBe("Categoria futura");
  });
});
