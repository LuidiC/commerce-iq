# SQL analysis and study map

This document connects each important query to a real business question. SQL source remains in `database/queries/`; snippets here are intentionally selective to avoid maintaining duplicate query bodies.

## Executive KPIs

**Business question:** What revenue, delivered-order count, AOV, customer reach, and satisfaction did the selected slice produce?

**Query:** `database/queries/overview/kpis.sql`

**Concepts:** multiple CTEs, `INNER JOIN`, `EXISTS`, correlated subqueries, `COALESCE`, aggregates, `COUNT(DISTINCT)`, bound optional filters.

**Logic:** `filtered_orders` establishes one row per qualifying order. One correlated `EXISTS` requires the same item to satisfy seller and category when both filters are active. `order_values` then aggregates matching item price at order grain. Review rows are averaged per order before the final mean, so neither items nor duplicate review rows add weight.

**Potential alternative:** one wide join followed by distinct aggregates. That is shorter but dangerous: items × reviews can multiply revenue. Explicit grains are easier to defend.

**Performance:** the partial delivered-order purchase index narrows the time range; item PK and product/seller indexes support existence checks.

**Expected output:** exactly one row, with numeric zeros for empty commercial metrics and `NULL` for an unavailable review average.

## Monthly revenue, MoM, cumulative total, and moving average

**Business question:** How is delivered item revenue evolving, and how does each month compare with the previous one?

**Query:** `database/queries/sales/monthly_revenue.sql`

**Concepts:** `date_trunc`, grouped aggregates, multiple CTEs, `LAG`, `LEAD`, `SUM() OVER`, `AVG() OVER`, `CASE`, `NULLIF`.

```sql
LAG(revenue) OVER (ORDER BY month) AS previous_revenue,
SUM(revenue) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) AS cumulative_revenue,
AVG(revenue) OVER (
  ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
) AS revenue_moving_average_3m
```

**Why `LAG`:** the comparison row is defined by time order. A self-join on “month - interval 1 month” is possible, but `LAG` communicates the analytical intent more directly.

**Why `LEAD`:** it is returned internally as a study example of the next observed period, then excluded from the public schema because future-looking output is not needed by the chart.

**Performance:** filtering occurs before aggregation/windowing. The window processes only monthly rows, not raw items.

**Expected output:** one row per calendar month in the requested period, sorted ascending. Missing months contain zero revenue/orders. The first MoM and a month following zero revenue return `NULL`.

## Category performance

**Business question:** Which categories drive revenue, and how concentrated is the mix?

**Query:** `database/queries/products/category_performance.sql`

**Concepts:** `LEFT JOIN`, `COALESCE`, `DENSE_RANK`, `SUM() OVER`, aggregate review, percentage share, pagination limit.

**Logic:** English translation is preferred, then Portuguese source key, then `unknown`. Revenue and item count stay at item grain. Reviews are reduced to one mean per order and each order contributes once per category. A dense rank avoids gaps for equal revenue.

**Alternative:** `RANK` is equally defensible when a tie should consume positions. `DENSE_RANK` better answers “which tier is this category in?”

**Performance:** `products(category_name, product_id)` and item product indexes support the grouping path. Limit is applied after correct global ranking.

## Customer purchase sequence and interval

**Business question:** Which purchase number was each order, and how long elapsed since the previous purchase?

**Query:** `database/queries/customers/purchase_sequence.sql`

**Concepts:** `ROW_NUMBER`, `LAG`, window partitioning, `HAVING`, subquery, date arithmetic.

**Logic:** order value is established at customer/order grain before sequencing. Ties are made deterministic with `order_id` after timestamp.

**Privacy:** this is a study/query artifact, not a public endpoint. It returns technical customer keys and must only be run in controlled analytical contexts.

**Alternative:** a correlated subquery could find the prior purchase, but repeatedly scanning customer history is less readable and usually less efficient.

## Repeat customer behavior

**Business question:** How many customers purchased again, and what is the average interval between purchases?

**Query:** `database/queries/customers/purchase_behavior.sql`

**Concepts:** multiple CTEs, `ROW_NUMBER`, `LAG`, filtered aggregates, conditional `COUNT`, behavioral segmentation.

**Definition caveat:** repeat status is scoped to the selected period. “High value” means item revenue of at least R$500 in that same period; it is a transparent rule, not an ML segment.

**Expected output:** one aggregate row. Average interval is `NULL` when there are no repeat purchases.

## Cohort retention

**Business question:** For customers acquired in a month, what percentage purchased in each later calendar month?

**Query:** `database/queries/retention/cohort_retention.sql`

**Concepts:** `DISTINCT`, `MIN() OVER`, `age`, date extraction, multi-CTE pipeline, cohort-size join, `NULLIF`.

**Logic:** customer-month is deduplicated first. Cohort month is the earliest available purchase month. Month number is the year/month difference, not an approximate day division. M0 supplies the cohort denominator.

**Interpretation:** this is purchase recurrence. It does not imply continuous activity between purchases, and first available purchase may not be a lifetime first purchase.

**Alternative:** PostgreSQL `generate_series` could produce explicit zero cells. The API intentionally returns only observed cells; the UI renders missing future/unobserved cells as unavailable.

## Seller ranking

**Business question:** Which anonymized sellers contribute the most delivered revenue, and how do order value and reviews compare?

**Query:** `database/queries/sellers/performance.sql`

**Concepts:** multi-table joins, grouped metrics, `RANK`, `NULLIF`, translated category filter.

**Why `RANK`:** equal revenue should share a position and leave the following ordinal gap, matching competition ranking. Seller reviews use the same per-order reduction as category reviews.

**Privacy:** public snapshot replaces source UUIDs with stable rank labels such as `Seller 01`.

## Delivery and review impact

**Business question:** Are late orders associated with lower review scores?

**Query:** `database/queries/delivery/review_impact.sql`

**Concepts:** `CASE`, interval extraction, `LEFT JOIN`, conditional correlated `EXISTS`, grouped percentage with `SUM(COUNT(*)) OVER`.

**Logic:** each delivered order with an actual delivery timestamp is classified using actual versus estimated delivery timestamp. Reviews are averaged per order before the left join, preserving order grain for counts, shares, and score averages. Orders without reviews remain in the delivery metrics.

**Interpretation:** the result is descriptive association. It cannot isolate seller, product, carrier, or expectation effects and therefore does not establish causality.

## Concepts not forced into production queries

`UNION`/`UNION ALL` are intentionally absent from the main endpoint path because the questions operate on one compatible fact stream; adding a union only to satisfy a checklist would reduce clarity. A natural future use would combine independently defined acquisition and repeat events for a funnel report. `NOT EXISTS` would be appropriate for “customers with no later purchase,” but the cohort denominator already answers the current need more directly.
