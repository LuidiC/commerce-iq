import argparse
import json
import logging
import os
from pathlib import Path

from commerceiq_etl.load import load_dataset
from commerceiq_etl.validation import dataset_fingerprint, validate_dataset


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Load the public Olist dataset into PostgreSQL")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path(os.getenv("DATA_DIR", "data/raw")),
        help="Directory containing the nine original CSV files",
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL"),
        help="ETL database URL; defaults to DATABASE_URL",
    )
    return parser


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    arguments = build_parser().parse_args()
    if not arguments.database_url:
        raise SystemExit("DATABASE_URL or --database-url is required")
    paths = validate_dataset(arguments.data_dir)
    fingerprint = dataset_fingerprint(paths)
    counts = load_dataset(arguments.database_url, paths, fingerprint)
    print(json.dumps({"fingerprint": fingerprint, "rows_loaded": counts}, indent=2))


if __name__ == "__main__":
    main()
