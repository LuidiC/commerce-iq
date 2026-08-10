# API

Base path: `/api/v1`. Interactive OpenAPI documentation: `/docs`.

## Common filters

| Parameter | Type | Validation |
|---|---|---|
| `start_date` | ISO date | default `2017-09-01` |
| `end_date` | ISO date | default `2018-08-31`, must be on/after start |
| `state` | string | two uppercase letters |
| `category` | string | 1–80 chars, bound parameter |
| `seller_id` | UUID | valid UUID |
| `limit` | integer | 1–100 on ranking endpoints |

The maximum date span is 1,100 days. Unknown fields are ignored by FastAPI's function boundary rather than used to build SQL.

## Endpoints

| Endpoint | Response |
|---|---|
| `GET /health` | service/database readiness; 503 when unavailable |
| `GET /overview` | KPIs, prior-period deltas, trend, categories, customer and delivery summary |
| `GET /sales` | monthly revenue, MoM, cumulative revenue, moving average |
| `GET /customers` | repeat behavior and high-value count |
| `GET /products` | category performance ranking |
| `GET /sellers` | anonymized seller ranking |
| `GET /retention` | long-form cohort retention cells |
| `GET /delivery` | on-time/late delivery comparison |

Example:

```http
GET /api/v1/products?start_date=2018-01-01&end_date=2018-06-30&state=SP&limit=10
Accept: application/json
```

## Error contract

Validation errors use FastAPI's structured HTTP 422 response. Unexpected failures return HTTP 500:

```json
{
  "error": {
    "code": "internal_error",
    "message": "The analytics service could not complete the request."
  }
}
```

Technical context is logged with request ID, method, path, status, and duration; stack traces are not sent to the client.
