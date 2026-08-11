# Security and privacy

## Simplified threat model

### Assets

- Database availability and integrity
- Deployment credentials and connection strings
- Trustworthiness of published analytics
- Anonymized source data and technical identifiers
- Application availability

### Threats and controls

| Threat | Controls |
|---|---|
| SQL injection through filters | Pydantic validation, bound Psycopg parameters, fixed query allowlist, no dynamic identifiers |
| Arbitrary SQL/file read | repository maps semantic names to constant paths; unknown names fail closed |
| Secret disclosure | `.env` ignored, `.env.example` placeholders, no frontend database credentials, safe errors |
| Database mutation through API | separate runtime `commerceiq_app` role with minimum privileges (CONNECT, schema USAGE, table SELECT) and read-only transactions |
| Expensive queries / resource exhaustion | max range and list limit, 10s statement timeout, small connection pool, platform rate limits recommended |
| Cross-origin browser access | explicit CORS origins including the stable Vercel frontend, wildcard rejection, GET-only methods, no credentials |
| Re-identification | aggregate endpoints, no customer IDs/source seller UUIDs/review text/exact coordinates in the browser or optional snapshot |
| Supply-chain vulnerability | exact versions, lockfile, and local `npm audit`/`pip-audit`; automated alerts recommended |
| Dataset schema drift / accidental change | exact headers, content fingerprint, constraints, atomic load |

## Security headers

The API sends `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`. Next.js sends nosniff, a strict-origin referrer policy, and disables camera, microphone, and geolocation through Permissions Policy. TLS and rate limiting belong at the deployment edge. Compose binds published ports to `127.0.0.1` so the local stack is not exposed to the LAN by default.

## Logging

Logs include timestamp, severity, endpoint, request ID, response status, and duration. They must not include database URLs, headers, review text, customer/seller UUIDs, or full SQL parameter values.

## Production access boundaries

The production API on Render uses the pooled Neon connection for `commerceiq_app`, never the database owner. Administrative credentials are limited to provisioning, migrations, and ETL execution. `CORS_ORIGINS` explicitly includes `https://commerce-iq-kappa.vercel.app`; it is not a wildcard and does not make the API authenticated or rate-limited.

## Residual risks

- Public endpoints can still be scraped or flooded; deploy-edge throttling is required for a public full-stack instance.
- Dependency vulnerabilities can emerge after release; lockfiles do not replace monitoring and patching.
- Anonymous identifiers in the raw dataset are still linkable within that dataset, so raw files remain server-side.
- A SHA-256 content fingerprint detects change but does not authenticate the Kaggle download.
- The public dataset license and attribution conditions are operational obligations, not enforced by code.
- A single-region free deployment can be unavailable during cold starts or provider maintenance.

## Security review checklist

- Scan Git history before publishing, not only the working tree.
- Rotate any credential ever pasted into a remote build log.
- Restrict database network access to the backend provider where available.
- Configure spend/rate limits before publishing the API.
- Review CORS and `NEXT_PUBLIC_API_URL` whenever the production frontend or API domain changes.
