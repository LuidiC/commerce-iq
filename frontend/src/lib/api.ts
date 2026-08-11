import type {
  AnalyticsFilters,
  AnalyticsSnapshot,
  CategoryOption,
  CategoryPerformance,
  Section
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const DATA_MODE = process.env.NEXT_PUBLIC_DATA_MODE ?? "snapshot";
export const USES_LIVE_API = DATA_MODE === "api";

export function toCategoryOption(category: CategoryPerformance): CategoryOption {
  return {
    value: category.category,
    labelPt: category.categoryName,
    labelEn: category.categoryNameEnglish
  };
}

export function buildQuery(
  filters: AnalyticsFilters,
  options: { omitCategory?: boolean } = {}
): string {
  const params = new URLSearchParams({
    start_date: filters.startDate,
    end_date: filters.endDate
  });
  if (filters.state) params.set("state", filters.state);
  if (filters.category && !options.omitCategory) params.set("category", filters.category);
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

async function request(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Analytics request failed with status ${response.status}`);
  return camelize(await response.json());
}

export async function loadAnalytics(
  filters: AnalyticsFilters,
  section: Section,
  signal?: AbortSignal
): Promise<AnalyticsSnapshot> {
  if (!USES_LIVE_API) {
    const snapshot = await request("/data/analytics.json", signal) as Omit<AnalyticsSnapshot, "categoryOptions">;
    return {
      ...snapshot,
      categoryOptions: snapshot.categories.map((item) => ({
        value: item.category,
        labelPt: item.category,
        labelEn: item.category
      }))
    };
  }

  const query = buildQuery(filters);
  const productPromise = request(`${API_URL}/products?${query}&limit=100`, signal);
  const optionPromise = filters.category
    ? request(`${API_URL}/products?${buildQuery(filters, { omitCategory: true })}&limit=100`, signal)
    : productPromise;
  const [overview, products, options, rawSellers, retention] = await Promise.all([
    request(`${API_URL}/overview?${query}`, signal),
    productPromise,
    optionPromise,
    section === "sellers"
      ? request(`${API_URL}/sellers?${query}&limit=50`, signal)
      : Promise.resolve([]),
    section === "retention"
      ? request(`${API_URL}/retention?${query}`, signal)
      : Promise.resolve([])
  ]) as [
    Omit<AnalyticsSnapshot, "source" | "categories" | "categoryOptions" | "sellers" | "retention"> & {
      topCategories: AnalyticsSnapshot["categories"];
    },
    AnalyticsSnapshot["categories"],
    AnalyticsSnapshot["categories"],
    AnalyticsSnapshot["sellers"],
    AnalyticsSnapshot["retention"]
  ];
  const { topCategories, ...overviewData } = overview;
  void topCategories;
  return {
    ...overviewData,
    source: {
      name: "Brazilian E-Commerce Public Dataset by Olist",
      license: "CC BY-NC-SA 4.0",
      datasetUrl: "https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce",
      generatedFromRawData: true
    },
    categories: products,
    categoryOptions: options.map(toCategoryOption),
    sellers: rawSellers,
    retention
  };
}
