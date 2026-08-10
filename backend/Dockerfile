FROM python:3.12.12-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /build
COPY backend/pyproject.toml ./pyproject.toml
COPY backend/app ./app
RUN python -m venv /opt/venv && /opt/venv/bin/pip install .

FROM python:3.12.12-slim AS runtime

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    QUERY_ROOT=/app/database/queries

RUN addgroup --system commerceiq && adduser --system --ingroup commerceiq commerceiq
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --chown=commerceiq:commerceiq backend/app ./app
COPY --chown=commerceiq:commerceiq database/queries ./database/queries
USER commerceiq
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
