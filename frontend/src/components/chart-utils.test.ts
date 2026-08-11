import { describe, expect, it } from "vitest";
import { evenlySpacedTicks, wrapChartLabel } from "./chart-utils";

describe("evenlySpacedTicks", () => {
  it("keeps the first and last month while selecting uniformly distributed mobile ticks", () => {
    const months = Array.from({ length: 12 }, (_, index) => `month-${index + 1}`);

    expect(evenlySpacedTicks(months, 5)).toEqual(["month-1", "month-4", "month-7", "month-9", "month-12"]);
  });
});

describe("wrapChartLabel", () => {
  it("wraps long localized category labels at word boundaries", () => {
    expect(wrapChartLabel("Informática e Acessórios", 18)).toEqual(["Informática e", "Acessórios"]);
  });
});
