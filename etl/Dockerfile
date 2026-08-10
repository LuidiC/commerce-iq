FROM python:3.12.12-slim

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN addgroup --system commerceiq && adduser --system --ingroup commerceiq commerceiq
WORKDIR /app
COPY etl/pyproject.toml ./pyproject.toml
COPY etl/commerceiq_etl ./commerceiq_etl
RUN pip install --upgrade pip==26.2.1 && pip install .
USER commerceiq
ENTRYPOINT ["commerceiq-etl"]
