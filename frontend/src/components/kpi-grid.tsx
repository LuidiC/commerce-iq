"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useLocale } from "@/i18n/locale-provider";
import { formatChange, formatCurrency, formatNumber } from "@/lib/format";
import type { AnalyticsSnapshot, Metric } from "@/lib/types";

function Kpi({ label, metric, format }: { label: string; metric: Metric; format: (value: number) => string }) {
  const { locale, message } = useLocale();
  const direction = metric.changePct === null || metric.changePct === 0 ? "neutral" : metric.changePct > 0 ? "positive" : "negative";
  const Icon = direction === "positive" ? ArrowUpRight : direction === "negative" ? ArrowDownRight : Minus;
  return (
    <article className="kpi-card">
      <div className="kpi-label">{label}</div>
      <strong>{format(metric.value)}</strong>
      <div className={`kpi-change ${direction}`}>
        <span><Icon size={14} />{formatChange(metric.changePct, locale)}</span>
        <small>{message.common.previousPeriod}</small>
      </div>
    </article>
  );
}

export function KpiGrid({ kpis }: { kpis: AnalyticsSnapshot["kpis"] }) {
  const { locale, message } = useLocale();
  return (
    <section className="kpi-grid" aria-label="Key performance indicators">
      <Kpi label={message.overview.revenue} metric={kpis.revenue} format={(value) => formatCurrency(value, locale)} />
      <Kpi label={message.overview.orders} metric={kpis.orders} format={(value) => formatNumber(value, locale)} />
      <Kpi label={message.overview.aov} metric={kpis.averageOrderValue} format={(value) => formatCurrency(value, locale)} />
      <Kpi label={message.overview.customers} metric={kpis.customers} format={(value) => formatNumber(value, locale)} />
      <Kpi label={message.overview.review} metric={kpis.averageReviewScore} format={(value) => `${formatNumber(value, locale, 2)} / 5`} />
    </section>
  );
}
