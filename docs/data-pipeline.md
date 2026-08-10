# Data pipeline

## Extract

`scripts/download_dataset.py` calls Kaggle's public dataset download endpoint, requires no embedded token, checks the archive for the exact nine expected filenames, rejects unexpected extraction paths, and writes raw files to the Git-ignored `data/raw/` directory.

Source: [Brazilian E-Commerce Public Dataset by Olist](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce), CC BY-NC-SA 4.0.

## Validate

`etl/commerceiq_etl/contracts.py` records exact source headers, including the source's original `lenght` spelling. Validation happens before connecting for mutation. All file bytes and logical names feed one SHA-256 fingerprint.

Validation failures name the file and expected/received header. Row failures include file and line number without logging the full record.

## Transform

- Blank strings become `NULL`.
- CSV integer-like floats are normalized to integers.
- Non-finite numeric values are rejected.
- States are uppercased and checked by PostgreSQL.
- Product translation gaps fall back to the Portuguese category so referential integrity is preserved.
- Duplicate geolocation samples become one ZIP-prefix centroid with the most common city/state.
- Review text is loaded for analytical completeness but never exposed publicly.

## Load

The loader uses Psycopg's COPY row protocol and follows foreign-key order:

1. categories and geolocations
2. customers and sellers
3. products
4. orders
5. items, payments, reviews

The full refresh is one transaction. A completed identical fingerprint is skipped. A new fingerprint replaces the analytical dataset atomically. A failed transaction records a bounded error in `etl_batches` after rollback.

## Operations

```bash
python scripts/download_dataset.py
docker compose up -d postgres
docker compose --profile tools run --rm etl
```

The database owner/ETL role writes; `commerceiq_app` receives only schema usage and SELECT. Raw data is mounted read-only into the ETL container.

## Limitations

- The source is a historical snapshot, not an incremental feed.
- Full refresh is appropriate for roughly 100k orders; it would need staging/swap tables at materially larger scale.
- Geolocation aggregation is representative, not a postal-authority centroid.
- The dataset license is non-commercial/share-alike; deployments must preserve attribution and respect those terms.
