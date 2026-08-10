import { describe, expect, it } from "vitest";
import { buildQuery } from "./api";

describe("analytics query", () => {
  it("serializes only active filters with API names", () => {
    const query = buildQuery({
      startDate: "2018-01-01",
      endDate: "2018-03-31",
      state: "SP",
      category: "health_beauty"
    });
    const params = new URLSearchParams(query);
    expect(params.get("start_date")).toBe("2018-01-01");
    expect(params.get("state")).toBe("SP");
    expect(params.get("category")).toBe("health_beauty");
  });

  it("can omit category when loading filter options", () => {
    const query = buildQuery(
      {
        startDate: "2018-01-01",
        endDate: "2018-03-31",
        category: "health_beauty"
      },
      { omitCategory: true }
    );

    expect(new URLSearchParams(query).has("category")).toBe(false);
  });
});
