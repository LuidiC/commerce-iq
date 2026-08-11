"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatCategoryPerformanceLabel } from "@/i18n/category-labels";
import { useLocale } from "@/i18n/locale-provider";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import type { CategoryPerformance, MonthlyRevenue, SellerPerformance } from "@/lib/types";

const gridColor = "#e8e8e3";
const axisStyle = { fontSize: 11, fill: "#74746d" };

export function RevenueChart({ data, movingAverage = false }: { data: MonthlyRevenue[]; movingAverage?: boolean }) {
  const { locale, message } = useLocale();
  return (
    <div className="chart-wrap" role="img" aria-label={message.overview.revenueTrend}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 800, height: 280 }}>
        <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#176b5b" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#176b5b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 4" />
          <XAxis dataKey="month" tickFormatter={(value: string) => formatDate(value, locale, { month: "short" })} tick={axisStyle} axisLine={false} tickLine={false} dy={8} />
          <YAxis tickFormatter={(value: number) => formatCompactCurrency(value, locale)} tick={axisStyle} axisLine={false} tickLine={false} width={68} />
          <Tooltip
            cursor={{ stroke: "#9b9b92", strokeDasharray: "3 3" }}
            contentStyle={{ border: "1px solid #deded8", borderRadius: 8, boxShadow: "0 10px 25px rgba(36, 36, 30, .08)" }}
            labelFormatter={(value) => formatDate(String(value), locale)}
            formatter={(value, name) => [formatCurrency(Number(value), locale), name === "revenue" ? message.common.revenue : message.sales.movingAverage]}
          />
          <Area type="monotone" dataKey="revenue" stroke="#176b5b" strokeWidth={2.2} fill="url(#revenueFill)" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />
          {movingAverage && <Line type="monotone" dataKey="revenueMovingAverage3m" stroke="#c77932" strokeWidth={1.8} strokeDasharray="5 4" dot={false} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({ data, limit = 8 }: { data: CategoryPerformance[]; limit?: number }) {
  const { locale, message } = useLocale();
  const chartData = data.slice(0, limit).map((item) => ({
    ...item,
    label: formatCategoryPerformanceLabel(item, locale)
  }));
  return (
    <div className="chart-wrap category-chart" role="img" aria-label={message.overview.categoryTitle}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 520, height: 280 }}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 18, bottom: 0, left: 4 }}>
          <CartesianGrid horizontal={false} stroke={gridColor} />
          <XAxis type="number" tickFormatter={(value) => formatCompactCurrency(value, locale)} tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={112} tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(value: string) => value.length > 18 ? `${value.slice(0, 17)}…` : value} />
          <Tooltip cursor={{ fill: "#f4f4f0" }} formatter={(value) => [formatCurrency(Number(value), locale), message.common.revenue]} />
          <Bar dataKey="revenue" fill="#176b5b" radius={[0, 3, 3, 0]} barSize={15} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SellerChart({ data }: { data: SellerPerformance[] }) {
  const { locale, message } = useLocale();
  return (
    <div className="chart-wrap" role="img" aria-label={message.sellers.chartTitle}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 800, height: 280 }}>
        <BarChart data={data.slice(0, 10)} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 4" />
          <XAxis dataKey="sellerLabel" tick={axisStyle} tickFormatter={(value: string) => value.replace("Seller ", "#")} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(value) => formatCompactCurrency(value, locale)} tick={axisStyle} axisLine={false} tickLine={false} width={70} />
          <Tooltip formatter={(value) => [formatCurrency(Number(value), locale), message.common.revenue]} />
          <Bar dataKey="revenue" fill="#176b5b" radius={[3, 3, 0, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
