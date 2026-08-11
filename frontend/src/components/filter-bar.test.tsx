// @vitest-environment jsdom

import "@/test/setup";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/i18n/locale-provider";
import { DEFAULT_FILTERS, FilterBar, useFilterState } from "./filter-bar";

const categories = [
  {
    value: "health_beauty",
    labelPt: "beleza_saude",
    labelEn: "health_beauty"
  }
];

describe("category filter localization", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  it("changes only the label when locale changes and preserves the selected value", () => {
    const onChange = vi.fn();
    render(
      <LocaleProvider>
        <FilterBar filters={DEFAULT_FILTERS} categories={categories} onChange={onChange} />
      </LocaleProvider>
    );

    const categorySelect = screen.getByLabelText("Categoria") as HTMLSelectElement;
    expect(within(categorySelect).getByRole("option", { name: "Beleza e Saúde" }))
      .toHaveValue("health_beauty");

    fireEvent.change(categorySelect, { target: { value: "health_beauty" } });
    expect(categorySelect).toHaveValue("health_beauty");

    act(() => {
      window.localStorage.setItem("commerceiq-locale", "en-US");
      window.dispatchEvent(new Event("commerceiq-locale"));
    });

    const localizedSelect = screen.getByLabelText("Category") as HTMLSelectElement;
    expect(localizedSelect).toHaveValue("health_beauty");
    expect(within(localizedSelect).getByRole("option", { name: "Health Beauty" }))
      .toHaveValue("health_beauty");

    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      category: "health_beauty"
    });
  });

  it("writes the stable category value to the dashboard query string", () => {
    function FilterStateHarness() {
      const [, setFilters] = useFilterState();
      return (
        <button onClick={() => setFilters({
          ...DEFAULT_FILTERS,
          category: "health_beauty"
        })}>
          Set category
        </button>
      );
    }

    render(<FilterStateHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Set category" }));

    expect(new URLSearchParams(window.location.search).get("category"))
      .toBe("health_beauty");
  });
});
