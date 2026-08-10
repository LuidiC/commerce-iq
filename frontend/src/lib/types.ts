export type Metric = {
  value: number | null;
  previousValue: number | null;
  changePct: number | null;
};

export type MonthlyRevenue = {
  month: string;
  revenue: number;
  orders: number;
  monthOverMonthPct: number | null;
  cumulativeRevenue: number;
  revenueMovingAverage3m: number;
};

export type CategoryPerformance = {
  category: string;
  revenue: number;
  orders: number;
  items: number;
  averageReviewScore: number | null;
  revenueRank: number;
  revenueSharePct: number;
};

export type CustomerBehavior = {
  customers: number;
  repeatCustomers: number;
  repeatCustomerRatePct: number;
  averageDaysBetweenPurchases: number | null;
  highValueCustomers: number;
};

export type DeliveryImpact = {
  deliveryStatus: "late" | "on_time";
  orders: number;
  averageDeliveryDays: number;
  averageReviewScore: number | null;
  orderSharePct: number;
};

export type SellerPerformance = {
  sellerLabel: string;
  state: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  averageReviewScore: number | null;
  revenueRank: number;
};

export type CohortRetention = {
  cohortMonth: string;
  monthNumber: number;
  cohortSize: number;
  activeCustomers: number;
  retentionRatePct: number;
};

export type AnalyticsSnapshot = {
  source: {
    name: string;
    license: string;
    datasetUrl: string;
    generatedFromRawData: boolean;
  };
  periodStart: string;
  periodEnd: string;
  kpis: {
    revenue: Metric;
    orders: Metric;
    averageOrderValue: Metric;
    customers: Metric;
    averageReviewScore: Metric;
  };
  revenueTrend: MonthlyRevenue[];
  categories: CategoryPerformance[];
  categoryOptions: string[];
  customerBehavior: CustomerBehavior;
  deliveryImpact: DeliveryImpact[];
  sellers: SellerPerformance[];
  retention: CohortRetention[];
};

export type AnalyticsFilters = {
  startDate: string;
  endDate: string;
  state?: string;
  category?: string;
};

export type Section =
  | "overview"
  | "sales"
  | "customers"
  | "products"
  | "sellers"
  | "retention"
  | "delivery";
