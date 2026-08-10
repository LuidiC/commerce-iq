# Metric definitions

All dates use the order purchase timestamp. `end_date` is inclusive at the HTTP boundary and converted to an exclusive next-day bound in the service.

| Metric | Definition | Grain / exclusions |
|---|---|---|
| Item revenue | `SUM(order_items.price)` | Delivered orders only; excludes freight, fees, taxes, discounts, returns |
| Delivered orders | `COUNT(DISTINCT order_id)` | Orders with status `delivered` |
| Average order value | item revenue / delivered orders | Filtered item revenue when category/seller filters are active |
| Unique customers | `COUNT(DISTINCT customer_unique_id)` | Technical anonymized key, delivered orders |
| Average review | mean order review score | 1–5; orders without a review excluded from the mean |
| MoM growth | `(current revenue - prior revenue) / prior revenue` | `NULL` when no comparable prior month or prior revenue is zero |
| Repeat customer | customer with more than one delivered order in the selected period | Period-scoped, not lifetime status |
| Repeat purchase rate | repeat customers / customers with a delivered order | Period-scoped |
| Days between purchases | day difference from `LAG(purchased_at)` within customer | Only subsequent purchases contribute |
| High-value customer | selected-period item revenue ≥ R$500 | Transparent behavioral segment, not predictive scoring |
| On-time delivery | delivered timestamp ≤ estimated delivery timestamp | Delivered orders with non-null delivered timestamp |
| Late delivery | delivered timestamp > estimated delivery timestamp | Descriptive relation to reviews; not causal inference |
| Cohort month | calendar month of first delivered purchase in available history | Based on dataset history, not the customer's true lifetime |
| Cohort retention M+n | customers from cohort with a purchase in exact month n / cohort size | Purchase recurrence, not subscription/activity retention |

## Previous-period comparison

The service constructs the immediately preceding period with the same number of calendar days. The default current period is 2017-09-01 through 2018-08-31; its comparison is 2016-09-01 through 2017-08-31. Early marketplace ramp-up makes the resulting growth descriptive and unsuitable as a normalized forecast.

## Filter semantics

- State refers to customer state.
- Category accepts the source Portuguese key or English translation.
- Seller is the anonymized seller UUID in API mode.
- Order KPIs use `EXISTS` to identify qualifying orders; item revenue then includes only matching items for category/seller filters.
