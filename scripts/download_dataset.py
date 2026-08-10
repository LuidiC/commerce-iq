import argparse
import shutil
import tempfile
import urllib.request
import zipfile
from pathlib import Path

KAGGLE_DOWNLOAD_URL = "https://www.kaggle.com/api/v1/datasets/download/olistbr/brazilian-ecommerce"
EXPECTED_FILES = {
    "olist_customers_dataset.csv",
    "olist_geolocation_dataset.csv",
    "olist_order_items_dataset.csv",
    "olist_order_payments_dataset.csv",
    "olist_order_reviews_dataset.csv",
    "olist_orders_dataset.csv",
    "olist_products_dataset.csv",
    "olist_sellers_dataset.csv",
    "product_category_name_translation.csv",
}


def safe_extract(archive: Path, destination: Path) -> None:
    with zipfile.ZipFile(archive) as zipped:
        members = {Path(name).name for name in zipped.namelist() if not name.endswith("/")}
        missing = EXPECTED_FILES - members
        if missing:
            raise RuntimeError(f"Dataset archive is missing: {', '.join(sorted(missing))}")
        destination.mkdir(parents=True, exist_ok=True)
        for member in zipped.infolist():
            filename = Path(member.filename).name
            if filename in EXPECTED_FILES:
                with zipped.open(member) as source, (destination / filename).open("wb") as target:
                    shutil.copyfileobj(source, target)


def main() -> None:
    parser = argparse.ArgumentParser(description="Download the official public Olist Kaggle dataset")
    parser.add_argument("--output", type=Path, default=Path("data/raw"))
    arguments = parser.parse_args()
    request = urllib.request.Request(
        KAGGLE_DOWNLOAD_URL,
        headers={"User-Agent": "CommerceIQ/0.1 dataset downloader"},
    )
    with tempfile.TemporaryDirectory(prefix="commerceiq-") as temporary:
        archive = Path(temporary) / "olist.zip"
        with urllib.request.urlopen(request, timeout=120) as response, archive.open("wb") as target:
            shutil.copyfileobj(response, target)
        safe_extract(archive, arguments.output)
    print(f"Downloaded {len(EXPECTED_FILES)} files to {arguments.output.resolve()}")


if __name__ == "__main__":
    main()
