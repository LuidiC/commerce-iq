# Deployment

Research date: **2026-08-10**. Provider limits change; re-check the linked official pages before creating resources.

## Recommended portfolio deployment

| Layer | Provider | Plan | Important limit |
|---|---|---|---|
| Frontend | Vercel | Hobby, $0 for personal non-commercial work | usage quotas; Hobby is restricted to personal/non-commercial use |
| API | Render | Free web service | spins down after 15 minutes; cold start can take about one minute |
| PostgreSQL | Neon | Free | 0.5 GB storage, 100 CU-hours/month/project, scales to zero after inactivity |

Official sources: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Render free services](https://render.com/docs/free), [Neon pricing](https://neon.com/pricing).

This combination is appropriate for a low-traffic portfolio. It is not a production SLA. Render's free PostgreSQL is not recommended because the current free database expires after 30 days; Neon has no stated time limit on the free tier at the research date.

## Path A — zero-cost visual demo

This is the lowest-maintenance option and has no cold-start dependency.

1. Download the dataset locally.
2. Install snapshot tooling with `pip install -e "etl[dev]"`.
3. Run `python scripts/build_demo_snapshot.py`.
4. Set `NEXT_PUBLIC_DATA_MODE=snapshot` in the frontend deployment.
5. Import the repository in Vercel with root directory `frontend`.
6. Build command: `npm run build`; output is handled by Next.js.

The UI labels the data as a fixed public-demo period and removes active filters. The snapshot contains only aggregate metrics and anonymized seller rank labels.

## Path B — full stack

### Neon database

1. Create a free Postgres project in a nearby region.
2. Run both migration files as the owner.
3. Create `commerceiq_app` with a generated password and grant only CONNECT, schema USAGE, and SELECT.
4. Run ETL once with the owner/ETL connection string.
5. Use Neon's pooled connection string for the API and set a statement timeout.

Confirm total relation size remains under the free 0.5 GB allowance:

```sql
SELECT pg_size_pretty(pg_database_size(current_database()));
```

### Render API

- Service type: Web Service, Free
- Root directory: repository root
- Runtime: Docker
- Dockerfile: `backend/Dockerfile`
- Health check: `/api/v1/health`
- Environment: `APP_DATABASE_URL`, `CORS_ORIGINS=https://<frontend-domain>`, `LOG_LEVEL=INFO`

The backend image expects `database/queries` at build time, so the Docker build context must remain the repository root.

### Vercel frontend

- Root directory: `frontend`
- `NEXT_PUBLIC_DATA_MODE=api`
- `NEXT_PUBLIC_API_URL=https://<render-service>/api/v1`

Redeploy the frontend after changing a `NEXT_PUBLIC_*` value because it is embedded at build time.

## Cold-start UX

Render documents an idle spin-down after 15 minutes and a wake-up around one minute. The frontend's loading state must remain visible and the fetch should be retried by the user rather than silently switching to stale or fabricated values. A paid always-on API is the clean upgrade if recruiter demo reliability becomes more important than zero cost.

## Cost and safety controls

- Do not add a payment method unless spend limits/alerts are configured.
- Restrict CORS to the actual frontend domain.
- Keep owner/ETL credentials out of the API service.
- Store secrets only in provider environment settings.
- Run a secret scan on Git history before pushing.
- Attribute the Olist dataset and preserve CC BY-NC-SA obligations.

## Not selected

- Railway's current “Free” onboarding becomes $1/month after a 30-day/$5 trial, so it is low-cost rather than permanently free ([official pricing](https://railway.com/pricing)).
- Render free Postgres expires after 30 days.
- A single VPS is inexpensive but introduces patching, firewall, backup, and uptime responsibility that distracts from the portfolio goal.
