"use client";

import { CalendarDays, Filter, RotateCcw } from "lucide-react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useLocale } from "@/i18n/locale-provider";
import type { AnalyticsFilters } from "@/lib/types";

const STATES = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];

export const DEFAULT_FILTERS: AnalyticsFilters = {
  startDate: "2017-09-01",
  endDate: "2018-08-31"
};

function readUrlFilters(): AnalyticsFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  const params = new URLSearchParams(window.location.search);
  return {
    startDate: params.get("from") ?? DEFAULT_FILTERS.startDate,
    endDate: params.get("to") ?? DEFAULT_FILTERS.endDate,
    state: params.get("state") ?? undefined,
    category: params.get("category") ?? undefined
  };
}

export function useFilterState() {
  const search = useSyncExternalStore(
    (notify) => {
      window.addEventListener("popstate", notify);
      window.addEventListener("commerceiq-url", notify);
      return () => {
        window.removeEventListener("popstate", notify);
        window.removeEventListener("commerceiq-url", notify);
      };
    },
    () => window.location.search,
    () => ""
  );
  const filters = useMemo(() => {
    if (!search) return DEFAULT_FILTERS;
    return readUrlFilters();
  }, [search]);
  const setFilters = useCallback((next: AnalyticsFilters) => {
    const params = new URLSearchParams();
    if (next.startDate !== DEFAULT_FILTERS.startDate) params.set("from", next.startDate);
    if (next.endDate !== DEFAULT_FILTERS.endDate) params.set("to", next.endDate);
    if (next.state) params.set("state", next.state);
    if (next.category) params.set("category", next.category);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
    window.dispatchEvent(new Event("commerceiq-url"));
  }, []);
  return [filters, setFilters] as const;
}

export function FilterBar({
  filters,
  categories,
  onChange
}: {
  filters: AnalyticsFilters;
  categories: string[];
  onChange: (filters: AnalyticsFilters) => void;
}) {
  const { message } = useLocale();
  const [draft, setDraft] = useState(filters);

  const apply = () => {
    onChange(draft);
  };

  const reset = () => {
    setDraft(DEFAULT_FILTERS);
    onChange(DEFAULT_FILTERS);
  };

  return (
    <section className="filter-bar" aria-label={message.common.period}>
      <div className="filter-heading"><Filter size={15} /><span>{message.common.period}</span></div>
      <label className="date-field">
        <span className="sr-only">{message.common.startDate}</span>
        <CalendarDays size={15} />
        <input type="date" min="2016-09-01" max={draft.endDate} value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} />
      </label>
      <span className="date-separator">—</span>
      <label className="date-field">
        <span className="sr-only">{message.common.endDate}</span>
        <input type="date" min={draft.startDate} max="2018-10-31" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} />
      </label>
      <label className="select-field">
        <span className="sr-only">{message.common.state}</span>
        <select value={draft.state ?? ""} onChange={(event) => setDraft({ ...draft, state: event.target.value || undefined })}>
          <option value="">{message.common.allStates}</option>
          {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
      </label>
      <label className="select-field category-select">
        <span className="sr-only">{message.common.category}</span>
        <select value={draft.category ?? ""} onChange={(event) => setDraft({ ...draft, category: event.target.value || undefined })}>
          <option value="">{message.common.allCategories}</option>
          {categories.map((category) => <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}
        </select>
      </label>
      <button className="button primary" onClick={apply}>{message.common.apply}</button>
      <button className="icon-button reset-filter" onClick={reset} aria-label={message.common.reset} title={message.common.reset}><RotateCcw size={16} /></button>
    </section>
  );
}
