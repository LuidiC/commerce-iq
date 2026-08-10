# Query performance

## Approach

CommerceIQ indexes access patterns, not every foreign key or filterable column. The baseline dataset is modest, so the goal is to demonstrate method and avoid both full-table complacency and index proliferation.

## Targeted indexes

| Index | Query path | Trade-off |
|---|---|---|
| partial `orders(purchased_at, order_id) WHERE status='delivered'` | nearly all analytics start with delivered orders and period | small/read-efficient; does not help other statuses |
| `orders(customer_id, purchased_at)` | purchase history | extra write/storage cost during full load |
| `customers(customer_unique_id)` | repeat analysis | accelerates grouping/join by stable buyer key |
| `order_items(product_id, order_id)` | category filtering/ranking | supports product-first access |
| `order_items(seller_id, order_id)` | seller filters/ranking | supports seller-first access |
| `products(category_name, product_id)` | category restriction | avoids scanning products by category |
| `order_reviews(order_id, score)` | order review lookup | covers score after order lookup |

The item primary key already indexes `(order_id, item_number)`, so an additional order-only item index is unnecessary.

## Reproducible EXPLAIN procedure

`database/queries/performance/category_revenue_explain.sql` contains the exact target statement. From PowerShell, pass it to the PostgreSQL container without copying application files into it:

```powershell
Get-Content database/queries/performance/category_revenue_explain.sql -Raw |
  docker compose exec -T postgres psql -U commerceiq_etl -d commerceiq
```

For a clean before/after comparison in a disposable database:

1. Load the dataset after migration `001_schema.sql` only.
2. Run `EXPLAIN (ANALYZE, BUFFERS)` and save the plan.
3. Apply `002_indexes_and_roles.sql`.
4. Run the same query after `ANALYZE orders; ANALYZE order_items; ANALYZE products;`.
5. Compare actual rows, loop counts, shared buffer hits/reads, scan types, and total execution time.

## What to look for

- The selective delivered/date predicate should be able to use `idx_orders_purchased_delivered` when the period is narrower than most of the table.
- PostgreSQL may still choose a sequential scan for a broad year on a small table. That can be correct; forcing an index would be worse.
- Item/product joins may use hash joins because a large portion of items contributes to the category aggregation.
- Row estimate errors indicate stale statistics or correlated columns, not automatically a missing index.

## Measured local validation — 2026-08-10

Environment: Docker Desktop 4.86.0, Docker Engine 29.7.2, Docker Compose 5.3.1, PostgreSQL 18.4-alpine. The database contained the completed Olist load with 99,441 orders and 112,650 order items. Before measuring, `ANALYZE orders; ANALYZE order_items; ANALYZE products;` was executed.

The category-revenue statement was measured twice on the same running database. The baseline used `BEGIN; DROP INDEX idx_orders_purchased_delivered; EXPLAIN (ANALYZE, BUFFERS); ROLLBACK;`, so the index and all data were restored automatically.

| Variant | Relevant plan choice | Shared-buffer hits | Execution time |
|---|---|---:|---:|
| Baseline (index transactionally removed) | parallel sequential scan of `orders` | 3,787 | 37.949 ms |
| Indexed | index-only scan on `idx_orders_purchased_delivered` | 2,619 | 40.225 ms |

The indexed plan reduced observed buffer hits by 1,168 (30.8%) and avoided heap fetches for `orders`. In this single warm-cache run its elapsed time was 2.276 ms slower, which is within normal local parallel-execution variance; it must not be presented as a CPU-time speedup. The evidence supports the access-path improvement, while repeated controlled runs would be required for a latency claim.

A second seller-focused `EXPLAIN (ANALYZE, BUFFERS)` filtered the top seller for the full dashboard period. It used a bitmap index scan on `idx_order_items_seller` and completed in **17.684 ms** with 2,259 shared-buffer hits. The comparison transaction was then checked: no invalid constraints were reported and `idx_orders_purchased_delivered` existed after `ROLLBACK`.

## Operational trade-off

ETL is a full refresh, so every secondary index adds load time and storage. Seven focused indexes are acceptable at this size. If ingestion frequency increased, loading into unindexed staging tables and swapping/materializing aggregates would be evaluated before adding more indexes.
