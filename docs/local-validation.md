# Local validation evidence

Validated on 2026-08-10 with Docker Desktop 4.86.0, Docker Engine 29.7.2, Docker Compose 5.3.1, and PostgreSQL 18.4-alpine. No public deployment was performed.

## Executed stack

`docker compose config --quiet` completed successfully, followed by `docker compose up --build --detach`.

| Service | Published port | Final health |
|---|---:|---|
| PostgreSQL | 5432 | healthy |
| FastAPI backend | 8000 | healthy |
| Next.js frontend | 3000 | healthy |

## Dataset load and integrity

`docker compose --profile tools run --build --rm etl` loaded the Olist CSV files with fingerprint `04955aba25dafdf8ba459b396716cacb5dfdbd7329beb14758996d251b81ab22`.

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

The following requests returned HTTP 200 against the loaded PostgreSQL instance: `/health`, `/overview`, `/sales`, `/customers`, `/products?limit=5`, `/sellers?limit=5`, `/retention`, and `/delivery`.

For the default dashboard period (2017-09-01 through 2018-08-31), `/overview` returned R$ 10,187,571.00 in revenue and 74,213 delivered orders. Applying `state=SP` returned R$ 3,976,325.47; applying `category=health_beauty` returned R$ 986,035.80; applying the top seller ID returned R$ 201,576.00. This confirms that the bound filters affect the real metrics.

Browser validation at `http://localhost:3000` showed the same default revenue and, after applying the state filter, updated the URL to `?state=SP` and displayed R$ 3,976,325. The PT and EN interfaces rendered without browser console warnings or errors.

## Automated checks

| Command | Result |
|---|---|
| `backend/.venv/Scripts/python.exe -m pytest` | 8 passed |
| `backend/.venv/Scripts/python.exe -m ruff check app tests` | passed |
| `backend/.venv/Scripts/python.exe -m mypy app` | passed |
| `backend/.venv/Scripts/python.exe -m pytest etl/tests` with `PYTHONPATH=etl` | 6 passed |
| `backend/.venv/Scripts/python.exe -m ruff check backend etl scripts` | passed |
| `npm run lint` | passed |
| `npm test` | 3 passed |
| `npm run build` | passed; 9 static routes |

Performance measurements and the exact reversible index comparison are recorded in [performance.md](performance.md).
