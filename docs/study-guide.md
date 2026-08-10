# Study guide

## 1. Product and metric story

CommerceIQ answers commercial, customer, product, seller, retention, and delivery questions over the public Olist sample. Its defensible claim is not merely that it renders a dashboard: it defines metrics at explicit grains, implements them in reviewable SQL, and delivers them through a tested application.

Be ready to explain why delivered item price is the revenue basis, why freight is excluded, why order/customer/item grains differ, and why the findings are descriptive rather than current Olist business performance.

## 2. Architecture walkthrough

Trace one filter from `frontend/src/components/filter-bar.tsx`, through `frontend/src/lib/api.ts`, FastAPI dependency validation, service orchestration, repository query loading, and the `.sql` file. Then trace the offline path from raw CSV to PostgreSQL `COPY`.

The modular monolith is a scope decision: one product and one maintainer do not justify service discovery, queues, distributed tracing, or separate release trains.

## 3. Database and grain walkthrough

Read `database/migrations/001_schema.sql` in foreign-key order. Know these grains without checking notes:

- `customers`: one source `customer_id`, usually tied to one order; `customer_unique_id` links repeat purchases.
- `orders`: one commercial order.
- `order_items`: one item sequence inside an order.
- `order_payments`: one payment sequence; never join it directly into item revenue.
- `order_reviews`: source review/order pairs; 547 orders have multiple review rows.
- `geolocations`: one derived ZIP-prefix centroid, not raw coordinate observations.

## 4. Metric walkthrough

Use `docs/metrics.md` as the contract and the SQL files as the implementation. Revenue stays at item grain. Review metrics first average review rows per order, then give each order equal weight. Category and seller averages deduplicate order/dimension pairs so multi-item orders do not receive extra review weight.

MoM uses a calendar-month spine. A seller with no sales in February and sales in March must not compare March with January. Repeat status and high-value status are scoped to the selected period. Cohort retention means a purchase in an exact later month, not continuous activity.

## 5. ETL walkthrough

The pipeline validates exact headers, fingerprints content, streams transformations, and executes one transactional full refresh through `COPY`. A completed matching fingerprint is skipped. A different input replaces the dataset atomically; an ordinary load exception rolls back and records a bounded failed batch.

The fingerprint supports idempotency and change detection, not authenticity. Fractional values in integer fields fail rather than truncate. Thirty-one geolocation rows outside the Brazil bounding box are excluded with a warning before centroids are calculated.

## 6. Backend and API walkthrough

`app/api` owns HTTP validation, `services` owns use-case composition, and `repositories` owns fixed SQL lookup and execution. Psycopg binds every value. The pool marks each transaction read-only and applies a statement timeout. Public dates are inclusive; the service converts `end_date` to the next exclusive day.

The API is synchronous because the workload is bounded and the code is simpler. That is not a claim that sync is universally faster. Empty valid periods return HTTP 200 with defined zeros, `null` review averages, and a zero-filled month spine.

## 7. Frontend walkthrough

The UI centralizes strings, locale formatting, filters, loading/empty/error states, and data adapters. API mode requests all category rows for the product page and filter options. Static mode uses one generated aggregate file and removes controls it cannot truthfully recompute.

Know why the frontend expects JSON numbers, why a previous string/number mismatch broke the retention matrix, and how the API test protects that boundary. Be able to demonstrate PT-BR and EN-US, keyboard focus, URL filters, and desktop/mobile layouts.

## 8. Security and operations walkthrough

Trace a malicious category value through length validation, a bound parameter, a static query path, a read-only transaction, a SELECT-only role, and a statement timeout. CORS is a browser policy, not authentication or rate limiting. Compose binds local ports to `127.0.0.1`; production TLS and throttling belong at the edge.

Dependency pins are not permanent safety. The 2026-08-10 audit moved Next.js to 16.3.0, Vitest to 4.1.10, FastAPI to 0.141.1, Pydantic Settings to 2.15.0, and explicitly pinned Starlette 1.3.1 after transitive advisories were found.

## 9. Test strategy walkthrough

Unit tests cover contracts, transformations, filters, serialization, service comparisons, formatting, and query-string behavior. PostgreSQL integration tests reconcile category revenue with overview revenue, verify delivery order grain, exercise empty periods, and prove that MoM does not jump across missing calendar months. These tests require `TEST_DATABASE_URL`; they are skipped otherwise.

# Interview questions (30)

| # | Level | Question | Why an interviewer asks | Related file / feature | Concept to master |
|---:|---|---|---|---|---|
| 1 | Fundamental | What business problem does CommerceIQ solve? | Tests whether the candidate can lead with value instead of tools. | `README.md`, overview | Problem framing and audience |
| 2 | Fundamental | Why is revenue `SUM(order_items.price)` for delivered orders? | Checks metric definition and exclusions. | `docs/metrics.md`, `overview/kpis.sql` | GMV proxy, freight/fees/returns limitations |
| 3 | Fundamental | Why are `customer_id` and `customer_unique_id` both needed? | Reveals whether source grain is understood. | `001_schema.sql`, customer queries | Entity identity and repeat linkage |
| 4 | Fundamental | What is the grain of every fact-like table? | Incorrect grains cause the most dangerous analytical bugs. | `docs/database-design.md` | Cardinality and keys |
| 5 | Fundamental | Why can joining items, payments, and reviews multiply money? | Tests join reasoning rather than syntax recall. | schema, `docs/sql-analysis.md` | Many-to-many multiplication |
| 6 | Fundamental | Why use `numeric` for money? | Checks database type judgment. | `001_schema.sql` | Exact decimal arithmetic |
| 7 | Fundamental | Why use `COPY` instead of row-by-row inserts? | Tests bulk-loading fundamentals. | `etl/load.py` | Protocol overhead, transactions, constraints |
| 8 | Fundamental | How is the load idempotent, and how is that different from incremental loading? | Distinguishes two commonly confused guarantees. | `validation.py`, `load.py` | Fingerprints, full refresh, idempotency |
| 9 | Fundamental | Why are SQL queries stored in `.sql` files instead of an ORM? | Tests whether the architecture supports the portfolio claim. | `repositories/analytics.py`, query tree | Visible analytical SQL and bounded abstraction |
| 10 | Fundamental | What is the difference between snapshot and API mode? | Checks honesty about demo capabilities. | `build_demo_snapshot.py`, `frontend/src/lib/api.ts` | Deployment adapter versus live computation |
| 11 | Intermediate | How are multiple review rows for one order handled? | Targets the corrected grain bug directly. | KPI/category/seller/delivery SQL | Per-order reduction and equal weighting |
| 12 | Intermediate | Why must seller and category filters match the same item? | Tests subtle combined-filter semantics. | `overview/kpis.sql`, retention/delivery SQL | Correlated `EXISTS` and dimensional conjunction |
| 13 | Intermediate | Why does monthly revenue generate a calendar spine? | Exposes whether MoM is truly month-over-month. | `sales/monthly_revenue.sql` | `generate_series`, zero months, `LAG` |
| 14 | Intermediate | Why is MoM `NULL` after a zero-revenue month? | Checks undefined percentage handling. | `monthly_revenue.sql` | Division by zero and semantic nulls |
| 15 | Intermediate | How do you prove category revenue is not duplicated? | Looks for reconciliation, not confidence. | `test_sql_integration.py` | Independent invariant and aggregate reconciliation |
| 16 | Intermediate | Why use `RANK` for sellers and `DENSE_RANK` for categories? | Tests business meaning of window functions. | seller/category SQL | Competition rank versus dense tiers |
| 17 | Intermediate | What exactly does repeat purchase rate measure? | Detects lifetime-versus-period confusion. | `purchase_behavior.sql` | Period-scoped denominator and numerator |
| 18 | Intermediate | Is “high-value customer” a model or a rule? | Checks whether a proxy is overstated. | `docs/metrics.md` | Transparent threshold versus prediction |
| 19 | Intermediate | What does M+n retention mean here? | Tests cohort interpretation. | `cohort_retention.sql` | Exact-month recurrence and cohort denominator |
| 20 | Intermediate | Why is the first available purchase not necessarily lifetime acquisition? | Checks dataset-boundary awareness. | retention docs/query | Left truncation and observation windows |
| 21 | Intermediate | Why is `end_date` inclusive in HTTP but exclusive in SQL? | Tests date-boundary correctness. | `services/analytics.py` | Half-open intervals |
| 22 | Intermediate | Why do valid empty periods return 200 rather than 500? | Tests API semantics and failure states. | customer/KPI/month SQL, frontend empty state | Empty result versus server error |
| 23 | Advanced | What happens if the ETL fails after `TRUNCATE`? | Probes transaction knowledge. | `etl/load.py` | Transactional DDL/DML, rollback, failed batch record |
| 24 | Advanced | What happens if the ETL process is killed rather than raising an ordinary exception? | Tests limits of the recorded failure guarantee. | `etl/load.py` | Connection rollback and missing failure telemetry |
| 25 | Advanced | Why are 31 geolocation rows excluded, and what bias could that create? | Tests whether cleaning choices are visible and defensible. | `transform.py`, `docs/data-pipeline.md` | Bounds validation, logging, derived centroids |
| 26 | Advanced | Why are eight delivered orders absent from delivery status metrics? | Checks handling of real source anomalies. | `review_impact.sql`, metrics docs | Nullable facts and defined classification |
| 27 | Advanced | Why can an index reduce buffer hits yet make one run slower? | Tests performance reasoning beyond “index = faster.” | `docs/performance.md` | Planner choice, cache, parallelism, variance |
| 28 | Advanced | How do pool size, synchronous handlers, and statement timeout interact under concurrent dashboard requests? | Probes operational behavior. | `db/pool.py`, `frontend/src/lib/api.ts` | Concurrency, backpressure, timeouts |
| 29 | Advanced | Why pin Starlette directly when FastAPI is the direct dependency? | Tests supply-chain and resolver awareness. | `backend/pyproject.toml` | Transitive vulnerabilities and compatible constraints |
| 30 | Advanced | Which critical behavior is still not protected by a default unit test run? | Looks for honest test limitations. | integration marker, Docker/ETL workflow | Environment-dependent integration, atomic-load testing, browser QA |

# Things you must understand before presenting this project

- Every table's grain and all join cardinalities.
- The revenue, AOV, review, repeat, delivery, and retention formulas.
- Why review and month grains were explicitly normalized before aggregation.
- The source period, license, anonymization, and representativeness limitations.
- How transaction rollback, fingerprinting, and `COPY` interact.
- How FastAPI validation becomes bound SQL parameters.
- Why SELECT grants, read-only transactions, CORS, and rate limiting solve different problems.
- The difference between static snapshot and live API deployment.
- Which checks run without PostgreSQL and which require an integration environment.
