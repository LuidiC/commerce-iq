import csv
import math
from collections import Counter, defaultdict
from collections.abc import Iterator
from pathlib import Path
from typing import Any


class RowTransformError(ValueError):
    pass


def nullable(value: str) -> str | None:
    cleaned = value.strip()
    return cleaned if cleaned else None


def integer(value: str) -> int | None:
    cleaned = nullable(value)
    return int(float(cleaned)) if cleaned is not None else None


def decimal_number(value: str) -> str | None:
    cleaned = nullable(value)
    if cleaned is None:
        return None
    number = float(cleaned)
    if not math.isfinite(number):
        raise RowTransformError(f"Non-finite numeric value: {value}")
    return cleaned


def zero_as_null_decimal(value: str) -> str | None:
    """Treat Olist's zero product dimensions as unknown, not physical values."""
    cleaned = decimal_number(value)
    if cleaned is None or float(cleaned) == 0:
        return None
    return cleaned


def rows(path: Path) -> Iterator[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        yield from csv.DictReader(source)


def transformed_rows(entity: str, path: Path) -> Iterator[tuple[Any, ...]]:
    for line_number, row in enumerate(rows(path), start=2):
        try:
            if entity == "customers":
                yield (
                    row["customer_id"],
                    row["customer_unique_id"],
                    int(row["customer_zip_code_prefix"]),
                    row["customer_city"].strip(),
                    row["customer_state"].strip().upper(),
                )
            elif entity == "sellers":
                yield (
                    row["seller_id"],
                    int(row["seller_zip_code_prefix"]),
                    row["seller_city"].strip(),
                    row["seller_state"].strip().upper(),
                )
            elif entity == "products":
                yield (
                    row["product_id"],
                    nullable(row["product_category_name"]),
                    integer(row["product_name_lenght"]),
                    integer(row["product_description_lenght"]),
                    integer(row["product_photos_qty"]),
                    zero_as_null_decimal(row["product_weight_g"]),
                    zero_as_null_decimal(row["product_length_cm"]),
                    zero_as_null_decimal(row["product_height_cm"]),
                    zero_as_null_decimal(row["product_width_cm"]),
                )
            elif entity == "orders":
                yield (
                    row["order_id"],
                    row["customer_id"],
                    row["order_status"],
                    row["order_purchase_timestamp"],
                    nullable(row["order_approved_at"]),
                    nullable(row["order_delivered_carrier_date"]),
                    nullable(row["order_delivered_customer_date"]),
                    row["order_estimated_delivery_date"],
                )
            elif entity == "items":
                yield (
                    row["order_id"],
                    int(row["order_item_id"]),
                    row["product_id"],
                    row["seller_id"],
                    row["shipping_limit_date"],
                    decimal_number(row["price"]),
                    decimal_number(row["freight_value"]),
                )
            elif entity == "payments":
                yield (
                    row["order_id"],
                    int(row["payment_sequential"]),
                    row["payment_type"],
                    int(row["payment_installments"]),
                    decimal_number(row["payment_value"]),
                )
            elif entity == "reviews":
                yield (
                    row["review_id"],
                    row["order_id"],
                    int(row["review_score"]),
                    nullable(row["review_comment_title"]),
                    nullable(row["review_comment_message"]),
                    row["review_creation_date"],
                    row["review_answer_timestamp"],
                )
            else:
                raise RowTransformError(f"Unsupported entity: {entity}")
        except (KeyError, TypeError, ValueError) as error:
            raise RowTransformError(f"{path.name}:{line_number}: {error}") from error


def category_rows(
    translations_path: Path, products_path: Path
) -> tuple[list[tuple[str, str]], set[str]]:
    translations = {
        row["product_category_name"].strip(): row["product_category_name_english"].strip()
        for row in rows(translations_path)
    }
    source_categories = {
        category
        for row in rows(products_path)
        if (category := row["product_category_name"].strip())
    }
    complete = [(category, translations.get(category, category)) for category in source_categories]
    return sorted(complete), source_categories


def geolocation_rows(path: Path) -> Iterator[tuple[Any, ...]]:
    coordinate_sums: dict[int, list[float]] = defaultdict(lambda: [0.0, 0.0, 0.0])
    cities: dict[int, Counter[str]] = defaultdict(Counter)
    states: dict[int, Counter[str]] = defaultdict(Counter)
    for line_number, row in enumerate(rows(path), start=2):
        try:
            prefix = int(row["geolocation_zip_code_prefix"])
            latitude = float(row["geolocation_lat"])
            longitude = float(row["geolocation_lng"])
            if not (-34 <= latitude <= 6 and -74 <= longitude <= -28):
                continue
            coordinate_sums[prefix][0] += latitude
            coordinate_sums[prefix][1] += longitude
            coordinate_sums[prefix][2] += 1
            cities[prefix][row["geolocation_city"].strip()] += 1
            states[prefix][row["geolocation_state"].strip().upper()] += 1
        except (KeyError, ValueError) as error:
            raise RowTransformError(f"{path.name}:{line_number}: {error}") from error

    for prefix, (latitude_sum, longitude_sum, count) in sorted(coordinate_sums.items()):
        yield (
            prefix,
            round(latitude_sum / count, 6),
            round(longitude_sum / count, 6),
            cities[prefix].most_common(1)[0][0],
            states[prefix].most_common(1)[0][0],
        )
