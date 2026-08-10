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

`database/queries/performance/category_revenue_explain.sql` contains the exact target statement.

```bash
docker compose exec postgres psql -U commerceiq_etl -d commerceiq \
  -f /workspace/database/queries/performance/category_revenue_explain.sql
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

## Verification status

The SQL and indexes are implemented, but measured before/after execution times are deliberately not published from this workspace because PostgreSQL/Docker is unavailable here. Inventing plan numbers would be misleading. Run the procedure above in the Compose environment and commit the actual plan files if performance evidence is needed for an interview.

## Operational trade-off

ETL is a full refresh, so every secondary index adds load time and storage. Seven focused indexes are acceptable at this size. If ingestion frequency increased, loading into unindexed staging tables and swapping/materializing aggregates would be evaluated before adding more indexes.
