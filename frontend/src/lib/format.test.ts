import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate } from "./format";

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
});
