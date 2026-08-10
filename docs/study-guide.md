# Study guide

## 1. What the project does

CommerceIQ answers commercial, customer, product, seller, retention, and delivery questions over the public Olist dataset. Its central claim is not “I made a dashboard”; it is “I can define trustworthy metrics in SQL and deliver them as maintainable software.”

Before presenting it, be able to explain why delivered item price is the revenue basis, why order/customer/item grains differ, and why every visible comparison has limitations.

## 2. Architecture walkthrough

Start at `docs/architecture.md`. Follow one request from URL filters in `frontend/src/components/filter-bar.tsx`, through `frontend/src/lib/api.ts`, FastAPI dependency validation, service orchestration, repository query loading, and the `.sql` file. Then follow the offline path from raw CSV to PostgreSQL COPY.

The main architectural decision is a modular monolith. One product and one maintainer do not justify distributed services.

## 3. Database walkthrough

Read `database/migrations/001_schema.sql` in dependency order. Focus on:

- why `customer_id` and `customer_unique_id` both exist;
- composite keys on items and payments;
- fixed-precision money;
- nullable delivery lifecycle fields;
- checks that reject impossible or unsupported values;
- why geolocation is reduced to ZIP-prefix centroids.

Use the ERD in `docs/database-design.md` to narrate cardinality before discussing columns.

## 4. ETL walkthrough

The pipeline is intentionally explicit:

1. exact source contract validation;
2. content fingerprint;
3. streaming transformations;
4. one transactional full refresh via COPY;
5. completed/failed batch record.

Know the difference between idempotency (“same input does not duplicate”) and incremental loading (“only new records are processed”). This pipeline provides the former, not the latter.

## 5. SQL concepts used

Study `docs/sql-analysis.md` beside the actual query files. Be able to write and explain:

- `LAG` for previous month and previous purchase;
- `ROW_NUMBER` for deterministic purchase sequence;
- `RANK` versus `DENSE_RANK`;
- a running total with an explicit window frame;
- cohort membership and month offset;
- why `EXISTS` filters an order without multiplying it;
- why aggregates must be computed at a known grain before joining.

## 6. Backend walkthrough

`app/api` owns HTTP validation, `services` owns use-case composition, and `repositories` owns SQL execution. The repository accepts semantic query names only. Psycopg binds all values. The database pool marks every API transaction read-only and sets a statement timeout.

The API is synchronous because the workload is small and database-bound. Do not claim sync is universally faster; claim it is simpler and adequate until measured concurrency requires another model.

## 7. API walkthrough

Open `/docs` in a running stack. Test a valid overview request, an invalid state, an inverted date range, and a `limit=101`. Note where HTTP 422 comes from and why unexpected exceptions return a generic 500 body.

Understand inclusive public `end_date` versus exclusive SQL bound (`end_date + 1 day`).

## 8. Frontend walkthrough

The UI has one reusable analytical page shell and section-specific content. Messages are centralized, locale formatting uses `Intl`, and URL parameters represent live API filters. Charts have titles/context and the underlying tables/metric summaries preserve meaning.

Static snapshot mode is deliberately labeled and does not display inactive filters. This is an honesty and UX decision, not a missing conditional.

## 9. Docker walkthrough

Compose starts PostgreSQL, runs ordered init scripts, waits for health, then starts API and UI. ETL is a tools profile so it does not reload data on every startup. Containers use non-root application users; PostgreSQL uses its official image user.

Know the difference between image build-time `NEXT_PUBLIC_*` variables and backend runtime secrets.

## 10. Security walkthrough

Trace the defense layers for a malicious category string: length validation → bound parameter → static SQL identifier/path → read-only database transaction → SELECT-only role → statement timeout. Explain why CORS is not an authorization control and why a public API still needs rate limiting.

## 11. Testing walkthrough

Tests prioritize contracts and decision logic: schema drift, numeric normalization, invalid filters, arbitrary query paths, equal previous periods, typed endpoint responses, locale formatting, and URL serialization. Integration SQL tests require PostgreSQL and should be added to CI with a service container.

## 12. Deployment walkthrough

Explain both modes in `docs/deployment.md`. The static mode optimizes reliability/cost but fixes filters. The full-stack mode demonstrates the actual architecture but introduces cold starts and free-tier capacity. Never claim a live URL or uptime that does not exist.

# Interview questions

## SQL

**Question:** Why use `LEFT JOIN` for reviews in delivery analysis?

**Expected answer:** Delivery facts exist even when the customer did not review. An inner join would silently remove those orders and bias order counts/timing toward reviewers.

**Project:** `database/queries/delivery/review_impact.sql`

**Question:** Why use `EXISTS` for category filtering in the KPI query?

**Expected answer:** The KPI's first CTE needs one row per order. Joining items just to test membership would multiply orders; `EXISTS` expresses a semi-join and preserves grain.

**Project:** `database/queries/overview/kpis.sql`

**Question:** What is the difference between `RANK` and `DENSE_RANK` here?

**Expected answer:** Both share a rank for ties; `RANK` leaves gaps and matches competition ranking for sellers, while `DENSE_RANK` keeps consecutive tiers for categories.

**Project:** `database/queries/sellers/performance.sql`, `database/queries/products/category_performance.sql`

**Question:** Why does the first MoM value return NULL?

**Expected answer:** No prior observed period exists. Returning zero would incorrectly claim no change rather than no comparison.

**Project:** `database/queries/sales/monthly_revenue.sql`

## Database

**Question:** Why are both customer identifiers stored?

**Expected answer:** Olist's `customer_id` belongs to an order/customer record, while `customer_unique_id` connects repeat purchases. The former preserves foreign-key integrity; the latter enables behavioral analysis.

**Project:** `docs/database-design.md`, `database/migrations/001_schema.sql`

**Question:** Why not denormalize into one wide table?

**Expected answer:** Entity grains differ and a wide table multiplies payments/reviews/items, risks incorrect sums, duplicates descriptive data, and weakens constraints. PostgreSQL can efficiently join this dataset.

**Project:** `docs/database-design.md`

## Python and ETL

**Question:** How is the load idempotent?

**Expected answer:** All source bytes produce a stable SHA-256. A completed matching batch is skipped; a different snapshot is transactionally full-refreshed, so reruns do not append duplicates.

**Project:** `etl/commerceiq_etl/validation.py`, `etl/commerceiq_etl/load.py`

**Question:** Why COPY instead of row-by-row inserts?

**Expected answer:** COPY minimizes statement and protocol overhead for bulk immutable CSV data while still participating in the transaction and constraints.

**Project:** `etl/commerceiq_etl/load.py`

## FastAPI and backend

**Question:** Why no ORM?

**Expected answer:** The application is read-only analytics and visible SQL is a primary portfolio goal. A small repository provides query allowlisting and bound parameters without translating analytical SQL into an abstraction that obscures it.

**Project:** `backend/app/repositories/analytics.py`

**Question:** How is an equal previous period calculated?

**Expected answer:** The service counts inclusive current-period days, ends the previous period at the current start (exclusive SQL boundary), and subtracts the same number of days.

**Project:** `backend/app/services/analytics.py`

## Frontend

**Question:** Why centralize strings rather than place PT/EN conditionals in components?

**Expected answer:** One message contract prevents scattered translation logic, makes completeness reviewable, and lets formatting depend on one locale context.

**Project:** `frontend/src/i18n/messages.ts`

**Question:** Why remove filters from snapshot mode?

**Expected answer:** A fixed aggregate file cannot recompute arbitrary period/state/category metrics. Showing controls would be fake functionality; full filters are available only when the API is active.

**Project:** `frontend/src/components/analytics-page.tsx`, `docs/technical-decisions.md`

## Architecture and Docker

**Question:** Why a monorepo and modular monolith?

**Expected answer:** The components evolve together under one maintainer. Directory boundaries provide separation without cross-repository releases, distributed tracing, service discovery, or duplicated CI.

**Project:** `docs/architecture.md`

**Question:** Why is ETL a Compose profile?

**Expected answer:** Starting the app should not reload an immutable dataset. Loading is an explicit operational action after the database is healthy.

**Project:** `docker-compose.yml`

## Security

**Question:** Why does a public dashboard need a separate database role?

**Expected answer:** Public does not mean trusted. A compromised API or query bug should not be able to mutate schema/data; the app role receives SELECT only and transactions are read-only.

**Project:** `database/migrations/002_indexes_and_roles.sql`, `backend/app/db/pool.py`

**Question:** Does CORS prevent API abuse?

**Expected answer:** No. CORS controls browser-origin access, not direct HTTP clients. Validation, statement timeouts, least privilege, and edge rate limits address abuse.

**Project:** `docs/security.md`

## Analytics

**Question:** Can the delivery query prove delays cause low reviews?

**Expected answer:** No. It shows association; category, seller, product quality, carrier, and expectations may confound the result. Causal claims require a different design.

**Project:** `docs/metrics.md`, `database/queries/delivery/review_impact.sql`

**Question:** What does cohort retention mean here?

**Expected answer:** The percentage of first-purchase-month customers with another delivered purchase in an exact later calendar month. It is not continuous activity or churn.

**Project:** `database/queries/retention/cohort_retention.sql`

# Things you must understand before claiming this project

- Every table's grain and all join cardinalities.
- The exact revenue and AOV formulas and why payment value is different.
- The source period, license, anonymization, and representativeness limitations.
- How CTEs and each window function change row grain.
- Why item/review/payment joins can multiply money.
- How customer_unique_id enables recurrence without being exposed.
- Why correlation between delay and review is not causation.
- How transaction rollback, fingerprinting, and COPY interact.
- How FastAPI validation becomes bound SQL parameters.
- Why SELECT grants, read-only transactions, and CORS solve different problems.
- The difference between static snapshot and live API deployment.
- Which checks were actually run and which need a PostgreSQL/Docker environment.
