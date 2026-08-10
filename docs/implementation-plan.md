# Implementation plan

## Phase 1 — Foundation

- Establish repository rules, environment contract, architectural decisions, licensing, and quality tooling.
- Confirm the dataset source/license and current supported framework/database lines.

**Exit check:** repository boundaries and a reproducible local contract are documented.

## Phase 2 — Data model and SQL

- Create normalized PostgreSQL tables mirroring the useful Olist entities.
- Add constrained keys, staged load ordering, targeted indexes, and least-privilege roles.
- Implement inspectable business queries for overview, sales, customers, products, sellers, retention, and delivery.

**Exit check:** migrations are internally consistent and critical analytics cover real business questions with reusable filters.

## Phase 3 — ETL

- Download via documented Kaggle workflow; validate filenames, columns, types, and row relationships.
- Normalize category translations, parse timestamps/numerics, and load transactionally using PostgreSQL COPY.
- Record batch metadata and make repeated execution safe.

**Exit check:** unit tests cover validation and transformation; load behavior is idempotent by source fingerprint.

## Phase 4 — API

- Add typed settings, database lifecycle, query loader, repositories, services, schemas, routes, errors, logs, and health endpoints.
- Expose stable filter contracts and pagination where tabular detail exists.

**Exit check:** API tests cover success, invalid filters, empty data, and safe error responses; OpenAPI is generated.

## Phase 5 — Product interface

- Implement the restrained design system, navigation, executive overview, domain pages, filter bar, locale selector, charts, tables, and explanatory copy.
- Keep filters in the URL and centralize locale-aware formatting.

**Exit check:** component/unit tests cover filters, formatting, and remote states; lint/typecheck/build pass.

## Phase 6 — Integration and operations

- Add container images, Compose health checks, database initialization, non-root processes, and start-up documentation.
- Validate browser-to-API filtering, CORS, database roles, and failure paths.

**Exit check:** Compose stack and ETL command are exercised where Docker is available.

## Phase 7 — Evidence and handoff

- Complete architecture, ERD, metrics, SQL study map, pipeline, API, performance, security, deploy, study guide, and README.
- Generate screenshots only from a running build backed by real aggregate data.

**Exit check:** final audit records verified commands and unresolved environmental limitations without inventing evidence.
