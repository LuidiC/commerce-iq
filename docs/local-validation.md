# Local validation evidence

Validated locally on 2026-08-10 with Docker Desktop 4.86.0, Docker Engine 29.7.2, Docker Compose 5.3.1, and PostgreSQL 18.4-alpine. This evidence covers the local stack only; the current production topology is documented in [deployment.md](deployment.md).

## Executed stack

`docker compose config --quiet` completed successfully, followed by `docker compose up --build --detach`.

| Service | Published port | Final health |
|---|---:|---|
| PostgreSQL | 55432 for this run (`POSTGRES_HOST_PORT`; default 5432) | healthy |
| FastAPI backend | 127.0.0.1:8000 | healthy |
| Next.js frontend | 127.0.0.1:3000 | healthy |

Port 55432 was used because an unrelated Windows PostgreSQL process already owned
5432. All published ports were bound to loopback only.

## Dataset load and integrity

`docker compose --profile tools run --build --rm etl` loaded the Olist CSV files with fingerprint `04955aba25dafdf8ba459b396716cacb5dfdbd7329beb14758996d251b81ab22`. A second execution returned `rows_loaded: {}` and `dataset_already_loaded`, confirming batch-level idempotency.

| Table | Rows |
|---|---:|
| customers | 99,441 |
| sellers | 3,095 |
| product_categories | 73 |
| products | 32,951 |
| orders | 99,441 |
| order_items | 112,650 |
| order_payments | 103,886 |
| order_reviews | 99,224 |
| geolocations | 19,011 |

The recorded batch status is `completed`. Catalog checks found 10 primary-key constraints, 7 foreign keys, 24 check constraints, one unique constraint, and 19 indexes including primary-key indexes. Six orphan checks (orders/customers, items/orders/products/sellers, payments/orders, and reviews/orders) each returned zero rows. No unvalidated constraints were found.

## API and frontend evidence

The following requests returned HTTP 200 against the loaded PostgreSQL instance: `/health`, `/overview`, `/sales`, `/customers`, `/products?limit=100`, `/sellers?limit=50`, `/retention`, and `/delivery`.

For the default dashboard period (2017-09-01 through 2018-08-31), `/overview` returned R$ 10,187,571.00 in revenue and 74,213 delivered orders. Applying `state=SP` returned R$ 3,976,325.47; applying `category=health_beauty` returned R$ 986,035.80; applying the top seller ID returned R$ 201,576.00. This confirms that the bound filters affect the real metrics.

All 74 product categories summed exactly to the overview revenue. Delivery groups contained 74,206 eligible orders and summed to 100.00%. Decimal fields were serialized as JSON numbers. An empty January 2016 period returned HTTP 200, zero orders, a null average review, a zero repeat-purchase rate, and one zero-valued calendar month.

Browser validation at `http://localhost:3000` showed the same default revenue and, after applying the state filter, updated the URL to `?state=SP` and displayed R$ 3,976,325. Retention rendered without the former numeric type exception. PT-BR and EN-US rendered with localized controls and accessibility labels. Desktop (1440×900), tablet (768×1024), and mobile (390×844) checks found no horizontal overflow or console errors.
All seven analytical routes rendered their expected headings and content without an error state.

## Automated checks

| Command | Result |
|---|---|
| `backend/.venv/Scripts/python.exe -m pytest` with `TEST_DATABASE_URL` | 14 passed, including 4 PostgreSQL integration tests |
| `backend/.venv/Scripts/python.exe -m pytest` without a database URL | 10 passed, 4 integration tests skipped |
| `backend/.venv/Scripts/python.exe -m ruff check .` | passed |
| `backend/.venv/Scripts/python.exe -m mypy app` | passed |
| `backend/.venv/Scripts/python.exe -m pytest` from `etl/` | 8 passed |
| `backend/.venv/Scripts/ruff.exe check .` from `etl/` | passed |
| `npm run lint` | passed |
| `npm test` | 5 passed |
| `npm run build` | passed; 9 static routes |
| `pip-audit --local` | no known vulnerabilities; local project packages skipped |
| `npm audit` | 0 vulnerabilities |

The `commerceiq_app` database role was verified with `SELECT=true` and
`INSERT/UPDATE/DELETE=false` on the analytical tables.

Performance measurements and the exact reversible index comparison are recorded in [performance.md](performance.md).
