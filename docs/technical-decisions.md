# Technical decisions

This log records decisions when they are made. Each entry is intentionally compact; deeper operational detail lives in the focused documents.

## TD-001 — Modular monorepo

**Status:** Accepted · **Date:** 2026-08-09

The ETL, database, API, UI, and documentation live in one repository because they form one product and are maintained by one developer. Clear directories preserve boundaries without the operational cost of distributed repositories or services.

## TD-002 — PostgreSQL and visible analytical SQL

**Status:** Accepted · **Date:** 2026-08-09

PostgreSQL is both the system of record for the imported dataset and the analytical engine. Core analysis remains in versioned `.sql` files so joins, CTEs, window functions, parameters, and performance choices are directly inspectable. An ORM would obscure the project's central competency and adds little value to a read-only analytics API.

## TD-003 — FastAPI with psycopg

**Status:** Accepted · **Date:** 2026-08-09

FastAPI provides typed HTTP boundaries and generated OpenAPI documentation. Psycopg is used directly through a small repository layer to preserve bound parameters and SQL visibility. The API is synchronous because the workload is small, read-heavy, and backed by a single database; async would add complexity without a measured benefit.

## TD-004 — Next.js App Router and Recharts

**Status:** Accepted · **Date:** 2026-08-09

Next.js provides a mature React production path, routing, and build tooling. Recharts is chosen for composable responsive charts and strong React integration. The application keeps chart count deliberate and provides textual summaries so the interface is still useful without visual interpretation.

## TD-005 — No authentication

**Status:** Accepted · **Date:** 2026-08-09

The product exposes only aggregate, read-only analysis of an anonymized public dataset. Authentication would create credential, session, recovery, and privacy surfaces without protecting user-owned data. Abuse is instead constrained through validation, pagination, timeouts, least-privilege database access, and deploy-platform rate limits.

## TD-006 — Olist public dataset

**Status:** Accepted · **Date:** 2026-08-09

The official Olist Kaggle dataset contains approximately 100,000 Brazilian marketplace orders from 2016–2018 across customers, orders, items, products, sellers, payments, reviews, and geolocation. It is real, anonymized commercial data and is licensed CC BY-NC-SA 4.0. Raw files are downloaded by the developer and never committed. The product clearly frames findings as analysis of this public sample, not Olist's complete operation.

## TD-007 — PostgreSQL 18, Next.js 16 active LTS

**Status:** Accepted · **Date:** 2026-08-09

PostgreSQL 18 is the current supported major with the longest support window. Next.js 16.2.11 is the active-LTS security line at the time of initialization. Runtime versions are pinned by container image or lockfile and should receive compatible security patches.

## TD-008 — Static real-data snapshot for zero-cost portfolio hosting

**Status:** Accepted · **Date:** 2026-08-09

The primary local architecture remains browser → FastAPI → PostgreSQL. A separately generated, versioned snapshot of aggregate results may power a static public demo where free persistent backend/database hosting is unavailable. The snapshot must use the same documented metric definitions, be cross-checked against SQL when PostgreSQL is available, contain no customer-level identifiers, and display its data period. It is a deployment adapter, not fabricated fallback data.
