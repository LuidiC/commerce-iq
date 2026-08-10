"use client";

import { Info, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryChart, RevenueChart, SellerChart } from "./charts";
import { DataPanel } from "./data-panel";
import { FilterBar, useFilterState } from "./filter-bar";
import { KpiGrid } from "./kpi-grid";
import { MetricChip } from "./metric-chip";
import { PageHeader } from "./page-header";
import { EmptyState, ErrorState, LoadingState } from "./states";
import { useLocale } from "@/i18n/locale-provider";
import { formatChange, formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { loadAnalytics, USES_LIVE_API } from "@/lib/api";
import type { AnalyticsSnapshot, CohortRetention, Section } from "@/lib/types";

export function AnalyticsPage({ section }: { section: Section }) {
  const { locale, message } = useLocale();
  const [filters, setFilters] = useFilterState();
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const fetchData = useCallback(() => {
    setStatus("loading");
    setReloadKey((value) => value + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    loadAnalytics(filters, controller.signal)
      .then((payload) => {
        setData(payload);
        setStatus("success");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [filters, reloadKey]);

  const sectionCopy = message[section];
  if (status === "loading") return <LoadingState />;
  if (status === "error" || !data) return <ErrorState onRetry={fetchData} />;
  if (!data.revenueTrend.length) return <EmptyState />;

  const categories = data.categories.map((item) => item.category);
  return (
    <>
      <div className="page-title-row">
        <PageHeader eyebrow={sectionCopy.eyebrow} title={sectionCopy.title} description={sectionCopy.description} />
        <div className="data-period"><span>{formatDate(data.periodStart, locale, { day: "2-digit", month: "short", year: "numeric" })}</span><i /> <span>{formatDate(data.periodEnd, locale, { day: "2-digit", month: "short", year: "numeric" })}</span></div>
      </div>
      {USES_LIVE_API ? (
        <FilterBar key={JSON.stringify(filters)} filters={filters} categories={categories} onChange={(nextFilters) => { setStatus("loading"); setFilters(nextFilters); }} />
      ) : (
        <section className="snapshot-bar"><ShieldCheck size={15} /><span>{message.common.fixedSnapshot}</span><b>{formatDate(data.periodStart, locale, { day: "2-digit", month: "2-digit", year: "numeric" })} — {formatDate(data.periodEnd, locale, { day: "2-digit", month: "2-digit", year: "numeric" })}</b></section>
      )}
      {section === "overview" && <Overview data={data} />}
      {section === "sales" && <Sales data={data} />}
      {section === "customers" && <Customers data={data} />}
      {section === "products" && <Products data={data} />}
      {section === "sellers" && <Sellers data={data} />}
      {section === "retention" && <Retention data={data} />}
      {section === "delivery" && <Delivery data={data} />}
    </>
  );
}

function Overview({ data }: { data: AnalyticsSnapshot }) {
  const { locale, message } = useLocale();
  const customer = data.customerBehavior;
  return (
    <div className="dashboard-stack">
      <KpiGrid kpis={data.kpis} />
      <div className="panel-grid overview-primary">
        <DataPanel title={message.overview.revenueTrend} context={message.overview.revenueTrendContext} className="wide-panel">
          <RevenueChart data={data.revenueTrend} />
        </DataPanel>
        <DataPanel title={message.overview.categoryTitle} context={message.overview.categoryContext}>
          <CategoryChart data={data.categories} />
        </DataPanel>
      </div>
      <div className="panel-grid overview-secondary">
        <DataPanel title={message.overview.customerTitle} context={message.overview.customerContext}>
          <div className="metric-chip-grid">
            <MetricChip label={message.overview.repeatRate} value={`${formatNumber(customer.repeatCustomerRatePct, locale, 2)}%`} />
            <MetricChip label={message.overview.repeatCustomers} value={formatNumber(customer.repeatCustomers, locale)} />
            <MetricChip label={message.overview.purchaseInterval} value={`${formatNumber(customer.averageDaysBetweenPurchases ?? 0, locale, 1)} ${message.overview.days}`} />
          </div>
        </DataPanel>
        <DataPanel title={message.overview.deliveryTitle} context={message.overview.deliveryContext}>
          <div className="delivery-comparison compact">
            {data.deliveryImpact.map((item) => (
              <div key={item.deliveryStatus}>
                <span className={item.deliveryStatus === "late" ? "delivery-dot late" : "delivery-dot"} />
                <strong>{item.deliveryStatus === "late" ? message.overview.late : message.overview.onTime}</strong>
                <b>{formatNumber(item.averageReviewScore ?? 0, locale, 2)} / 5</b>
                <small>{formatNumber(item.orderSharePct, locale, 1)}% {message.common.orders.toLowerCase()}</small>
              </div>
            ))}
          </div>
        </DataPanel>
      </div>
    </div>
  );
}

function Sales({ data }: { data: AnalyticsSnapshot }) {
  const { locale, message } = useLocale();
  return (
    <div className="dashboard-stack">
      <KpiGrid kpis={data.kpis} />
      <DataPanel title={message.sales.trendTitle} context={message.sales.trendContext}>
        <RevenueChart data={data.revenueTrend} movingAverage />
      </DataPanel>
      <DataPanel title={message.sales.tableTitle}>
        <div className="table-scroll"><table>
          <thead><tr><th>{message.sales.month}</th><th>{message.common.revenue}</th><th>{message.common.orders}</th><th>{message.sales.mom}</th><th>{message.sales.cumulative}</th></tr></thead>
          <tbody>{data.revenueTrend.map((row) => <tr key={row.month}>
            <td><strong>{formatDate(row.month, locale)}</strong></td>
            <td>{formatCurrency(row.revenue, locale)}</td>
            <td>{formatNumber(row.orders, locale)}</td>
            <td><span className={`table-delta ${(row.monthOverMonthPct ?? 0) < 0 ? "negative" : "positive"}`}>{formatChange(row.monthOverMonthPct, locale)}</span></td>
            <td>{formatCurrency(row.cumulativeRevenue, locale)}</td>
          </tr>)}</tbody>
        </table></div>
      </DataPanel>
    </div>
  );
}

function Customers({ data }: { data: AnalyticsSnapshot }) {
  const { locale, message } = useLocale();
  const item = data.customerBehavior;
  return (
    <div className="dashboard-stack">
      <div className="metric-card-grid four">
        <MetricChip label={message.customers.total} value={formatNumber(item.customers, locale)} />
        <MetricChip label={message.customers.repeat} value={formatNumber(item.repeatCustomers, locale)} />
        <MetricChip label={message.customers.repeatRate} value={`${formatNumber(item.repeatCustomerRatePct, locale, 2)}%`} />
        <MetricChip label={message.customers.highValue} value={formatNumber(item.highValueCustomers, locale)} />
      </div>
      <div className="panel-grid split-60">
        <DataPanel title={message.customers.interval}>
          <div className="hero-number">{formatNumber(item.averageDaysBetweenPurchases ?? 0, locale, 1)} <span>{message.overview.days}</span></div>
          <div className="interval-scale"><span /><i style={{ left: "42%" }} /><b>0</b><b>100+</b></div>
        </DataPanel>
        <aside className="insight-card"><ShieldCheck size={21} /><h2>{message.customers.noteTitle}</h2><p>{message.customers.noteBody}</p></aside>
      </div>
    </div>
  );
}

function Products({ data }: { data: AnalyticsSnapshot }) {
  const { locale, message } = useLocale();
  return (
    <div className="dashboard-stack">
      <DataPanel title={message.products.chartTitle}><CategoryChart data={data.categories} limit={10} /></DataPanel>
      <DataPanel title={message.products.tableTitle}>
        <div className="table-scroll"><table>
          <thead><tr><th>{message.common.rank}</th><th>{message.common.category}</th><th>{message.common.revenue}</th><th>{message.products.share}</th><th>{message.common.orders}</th><th>{message.products.items}</th><th>{message.common.review}</th></tr></thead>
          <tbody>{data.categories.slice(0, 25).map((row) => <tr key={row.category}>
            <td className="rank-cell">{String(row.revenueRank).padStart(2, "0")}</td><td><strong className="category-name">{row.category.replaceAll("_", " ")}</strong></td><td>{formatCurrency(row.revenue, locale)}</td><td><div className="share-cell"><span><i style={{ width: `${Math.min(100, row.revenueSharePct * 5)}%` }} /></span><b>{formatNumber(row.revenueSharePct, locale, 1)}%</b></div></td><td>{formatNumber(row.orders, locale)}</td><td>{formatNumber(row.items, locale)}</td><td>{formatNumber(row.averageReviewScore ?? 0, locale, 2)}</td>
          </tr>)}</tbody>
        </table></div>
      </DataPanel>
    </div>
  );
}

function Sellers({ data }: { data: AnalyticsSnapshot }) {
  const { locale, message } = useLocale();
  return (
    <div className="dashboard-stack">
      <DataPanel title={message.sellers.chartTitle}><SellerChart data={data.sellers} /></DataPanel>
      <DataPanel title={message.sellers.tableTitle}>
        <div className="table-scroll"><table>
          <thead><tr><th>{message.common.rank}</th><th>{message.sellers.seller}</th><th>{message.common.state}</th><th>{message.common.revenue}</th><th>{message.common.orders}</th><th>{message.sellers.aov}</th><th>{message.common.review}</th></tr></thead>
          <tbody>{data.sellers.slice(0, 25).map((row) => <tr key={row.sellerLabel}>
            <td className="rank-cell">{String(row.revenueRank).padStart(2, "0")}</td><td><strong>{row.sellerLabel}</strong></td><td><span className="state-badge">{row.state}</span></td><td>{formatCurrency(row.revenue, locale)}</td><td>{formatNumber(row.orders, locale)}</td><td>{formatCurrency(row.averageOrderValue, locale)}</td><td>{formatNumber(row.averageReviewScore ?? 0, locale, 2)}</td>
          </tr>)}</tbody>
        </table></div>
      </DataPanel>
    </div>
  );
}

function Retention({ data }: { data: AnalyticsSnapshot }) {
  const { message } = useLocale();
  const cohorts = useMemo(() => {
    const grouped = new Map<string, CohortRetention[]>();
    data.retention.forEach((item) => grouped.set(item.cohortMonth, [...(grouped.get(item.cohortMonth) ?? []), item]));
    return [...grouped.entries()].slice(-12);
  }, [data.retention]);
  return (
    <div className="dashboard-stack">
      <DataPanel title={message.retention.matrixTitle} context={message.retention.matrixContext}>
        <div className="cohort-scroll"><table className="cohort-table">
          <thead><tr><th>{message.retention.cohort}</th><th>{message.retention.size}</th>{Array.from({ length: 12 }, (_, index) => <th key={index}>M{index}</th>)}</tr></thead>
          <tbody>{cohorts.map(([cohort, cells]) => {
            const byMonth = new Map(cells.map((cell) => [cell.monthNumber, cell]));
            return <tr key={cohort}><td><strong>{cohort}</strong></td><td>{byMonth.get(0)?.cohortSize}</td>{Array.from({ length: 12 }, (_, month) => {
              const cell = byMonth.get(month); const value = cell?.retentionRatePct;
              return <td key={month}>{value === undefined ? <span className="cohort-na">—</span> : <span className="cohort-cell" style={{ "--intensity": Math.max(0.08, Math.min(1, value / (month === 0 ? 100 : 3))) } as React.CSSProperties}>{value.toFixed(month === 0 ? 0 : 1)}%</span>}</td>;
            })}</tr>;
          })}</tbody>
        </table></div>
      </DataPanel>
      <aside className="insight-card horizontal"><Info size={20} /><div><h2>{message.retention.matrixContext}</h2><p>M0 = 100%. Values after acquisition are intentionally low and represent a purchase in that exact month.</p></div></aside>
    </div>
  );
}

function Delivery({ data }: { data: AnalyticsSnapshot }) {
  const { locale, message } = useLocale();
  return (
    <div className="dashboard-stack">
      <DataPanel title={message.delivery.comparisonTitle}>
        <div className="delivery-cards">{data.deliveryImpact.map((item) => <article key={item.deliveryStatus} className={item.deliveryStatus === "late" ? "is-late" : ""}>
          <header><span className={item.deliveryStatus === "late" ? "delivery-dot late" : "delivery-dot"} /><h3>{item.deliveryStatus === "late" ? message.overview.late : message.overview.onTime}</h3><strong>{formatNumber(item.orderSharePct, locale, 1)}%</strong></header>
          <div><MetricChip label={message.delivery.deliveryDays} value={`${formatNumber(item.averageDeliveryDays, locale, 1)} ${message.overview.days}`} /><MetricChip label={message.common.review} value={`${formatNumber(item.averageReviewScore ?? 0, locale, 2)} / 5`} /><MetricChip label={message.common.orders} value={formatNumber(item.orders, locale)} /></div>
        </article>)}</div>
      </DataPanel>
      <aside className="insight-card horizontal warning"><Info size={20} /><div><h2>{message.delivery.insightTitle}</h2><p>{message.delivery.insightBody}</p></div></aside>
    </div>
  );
}
