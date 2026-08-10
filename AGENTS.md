# CommerceIQ Engineering Guide

## Purpose

CommerceIQ is a portfolio-grade analytics product built around the public Olist e-commerce dataset. Keep every change explainable, reproducible, and proportionate to the problem. Prefer professional simplicity over artificial complexity.

## Architecture boundaries

- `etl/` owns extraction, validation, transformation, and PostgreSQL loading.
- `database/` owns schema migrations, indexes, and human-readable analytical SQL.
- `backend/` exposes versioned read-only analytics endpoints through FastAPI.
- `frontend/` owns presentation, internationalization, filters, and visualization.
- `docs/` records decisions, definitions, limitations, and operating knowledge.
- Analytical SQL must remain in `.sql` files. Do not hide material analysis in ORM code or Python strings.
- Keep this a modular monolith. Do not add authentication, queues, caches, microservices, or orchestration platforms without a documented, concrete need.

## Commands

From the repository root:

```bash
docker compose up --build
docker compose run --rm etl
```

Backend:

```bash
cd backend
python -m venv .venv
pip install -e ".[dev]"
pytest
ruff check .
mypy app
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
npm run lint
npm test
npm run build
```

## Database conventions

- PostgreSQL 18 is the target runtime.
- Migrations are immutable, ordered SQL files under `database/migrations/`.
- Use `snake_case`, plural table names, explicit primary/foreign keys, and appropriate checks.
- All externally supplied values must be bound parameters. Never interpolate filter values into SQL.
- New analytics must define the business question and metric semantics in `docs/metrics.md` or `docs/sql-analysis.md`.
- Add indexes only after identifying a real access pattern; document read/write/storage trade-offs.
- ETL loads must be idempotent at the batch level and must fail atomically.

## Backend conventions

- Use type hints and Pydantic models at API boundaries.
- Route handlers validate HTTP concerns, services coordinate use cases, repositories execute SQL.
- Return stable public error messages and log technical context without secrets or personal data.
- Keep endpoints read-only and versioned under `/api/v1`.
- Pagination defaults and maximums must be enforced for table endpoints.

## Frontend conventions

- TypeScript strict mode is mandatory.
- User-facing strings belong in `src/i18n/messages.ts`; default locale is `pt-BR`.
- Currency remains BRL for both locales; dates and numbers follow the selected locale.
- Filters are reflected in URL query parameters and must affect all relevant panels consistently.
- Every remote-data view needs loading, empty, and error states.
- Use semantic HTML, visible keyboard focus, labeled controls, and textual context for charts.
- Avoid generic dashboard decoration, excessive cards, 3D charts, and color without semantic meaning.

## Security

- Never commit `.env`, credentials, Kaggle tokens, raw dataset files, database dumps, or production logs.
- Keep CORS allowlists restrictive and environment-driven.
- Validate query parameters and use bound SQL parameters exclusively.
- The database application role is read-only; the ETL role owns writes.
- Do not expose raw customer identifiers, review text, exact coordinates, or other re-identification vectors through the API.

## Testing and definition of done

A change is complete only when:

1. Its behavior is covered by focused tests at the appropriate layer.
2. Relevant tests, lint, type checks, and builds have been run successfully.
3. Database or metric changes include migration/query documentation.
4. User-visible changes work in PT-BR and EN-US and include loading/empty/error behavior.
5. Security, privacy, accessibility, and failure modes were considered.
6. Documentation reflects the implemented behavior, not an aspiration.
7. No placeholder text, hidden fake data, visible TODO, secret, or dead code was introduced.

If the local environment cannot execute a required verification, record that limitation precisely in the handoff.
