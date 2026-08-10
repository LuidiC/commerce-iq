import type { AnalyticsFilters, AnalyticsSnapshot } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const DATA_MODE = process.env.NEXT_PUBLIC_DATA_MODE ?? "snapshot";
export const USES_LIVE_API = DATA_MODE === "api";

export function buildQuery(filters: AnalyticsFilters): string {
  const params = new URLSearchParams({
    start_date: filters.startDate,
    end_date: filters.endDate
  });
  if (filters.state) params.set("state", filters.state);
  if (filters.category) params.set("category", filters.category);
  return params.toString();
}

function camelize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        camelize(item)
      ])
    );
  }
  return value;
}

export async function loadAnalytics(filters: AnalyticsFilters, signal?: AbortSignal): Promise<AnalyticsSnapshot> {
  if (!USES_LIVE_API) {
    const response = await fetch("/data/analytics.json", { signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Analytics request failed with status ${response.status}`);
    return camelize(await response.json()) as AnalyticsSnapshot;
  }

  const query = buildQuery(filters);
  const responses = await Promise.all([
    fetch(`${API_URL}/overview?${query}`, { signal, headers: { Accept: "application/json" } }),
    fetch(`${API_URL}/sellers?${query}&limit=50`, { signal, headers: { Accept: "application/json" } }),
    fetch(`${API_URL}/retention?${query}`, { signal, headers: { Accept: "application/json" } })
  ]);
  const failed = responses.find((response) => !response.ok);
  if (failed) throw new Error(`Analytics request failed with status ${failed.status}`);
  const [overview, rawSellers, retention] = (await Promise.all(
    responses.map(async (response) => camelize(await response.json()))
  )) as [
    Omit<AnalyticsSnapshot, "source" | "categories" | "sellers" | "retention"> & {
      topCategories: AnalyticsSnapshot["categories"];
    },
    Array<Omit<AnalyticsSnapshot["sellers"][number], "sellerLabel"> & { sellerId: string }>,
    AnalyticsSnapshot["retention"]
  ];
  const { topCategories, ...overviewData } = overview;
  return {
    ...overviewData,
    source: {
      name: "Brazilian E-Commerce Public Dataset by Olist",
      license: "CC BY-NC-SA 4.0",
      datasetUrl: "https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce",
      generatedFromRawData: true
    },
    categories: topCategories ?? [],
    sellers: rawSellers.map((seller, index) => ({
      sellerLabel: `Seller ${String(index + 1).padStart(2, "0")}`,
      state: seller.state,
      revenue: seller.revenue,
      orders: seller.orders,
      averageOrderValue: seller.averageOrderValue,
      averageReviewScore: seller.averageReviewScore,
      revenueRank: seller.revenueRank
    })),
    retention
  };
}
