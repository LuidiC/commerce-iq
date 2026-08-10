import json
import logging
from collections.abc import Iterable
from typing import Any

import psycopg
from psycopg import Connection

from commerceiq_etl.transform import category_rows, geolocation_rows, transformed_rows

logger = logging.getLogger("commerceiq.etl")

COPY_STATEMENTS = {
    "customers": (
        "COPY customers "
        "(customer_id, customer_unique_id, zip_code_prefix, city, state) FROM STDIN"
    ),
    "sellers": "COPY sellers (seller_id, zip_code_prefix, city, state) FROM STDIN",
    "products": (
        "COPY products (product_id, category_name, name_length, description_length, "
        "photos_quantity, weight_g, length_cm, height_cm, width_cm) FROM STDIN"
    ),
    "orders": (
        "COPY orders (order_id, customer_id, status, purchased_at, approved_at, "
        "delivered_to_carrier_at, delivered_to_customer_at, estimated_delivery_at) FROM STDIN"
    ),
    "items": (
        "COPY order_items (order_id, item_number, product_id, seller_id, "
        "shipping_limit_at, price, freight_value) FROM STDIN"
    ),
    "payments": (
        "COPY order_payments (order_id, payment_sequence, payment_type, "
        "installments, payment_value) FROM STDIN"
    ),
    "reviews": (
        "COPY order_reviews "
        "(review_id, order_id, score, title, message, created_at, answered_at) FROM STDIN"
    ),
    "geolocation": (
        "COPY geolocations (zip_code_prefix, latitude, longitude, city, state) FROM STDIN"
    ),
    "categories": "COPY product_categories (category_name, category_name_english) FROM STDIN",
}


def copy_rows(connection: Connection[Any], entity: str, source: Iterable[tuple[Any, ...]]) -> int:
    count = 0
    with connection.cursor().copy(COPY_STATEMENTS[entity]) as copy:
        for row in source:
            copy.write_row(row)
            count += 1
    logger.info("entity_loaded", extra={"entity": entity, "rows": count})
    return count


def load_dataset(database_url: str, paths: dict[str, Any], fingerprint: str) -> dict[str, int]:
    with psycopg.connect(database_url) as connection:
        existing = connection.execute(
            "SELECT status FROM etl_batches WHERE source_sha256 = %s", (fingerprint,)
        ).fetchone()
        if existing and existing[0] == "completed":
            logger.info("dataset_already_loaded", extra={"fingerprint": fingerprint})
            return {}

        connection.execute(
            """
            INSERT INTO etl_batches (source_name, source_sha256, status)
            VALUES ('olist-public-ecommerce', %s, 'running')
            ON CONFLICT (source_sha256) DO UPDATE
            SET status = 'running', started_at = now(), completed_at = NULL, error_message = NULL
            """,
            (fingerprint,),
        )
        try:
            connection.execute(
                "TRUNCATE order_reviews, order_payments, order_items, orders, products, "
                "product_categories, sellers, customers, geolocations"
            )
            counts: dict[str, int] = {}
            categories, _ = category_rows(paths["categories"], paths["products"])
            counts["categories"] = copy_rows(connection, "categories", categories)
            counts["geolocation"] = copy_rows(
                connection, "geolocation", geolocation_rows(paths["geolocation"])
            )
            entities = (
                "customers",
                "sellers",
                "products",
                "orders",
                "items",
                "payments",
                "reviews",
            )
            for entity in entities:
                counts[entity] = copy_rows(
                    connection, entity, transformed_rows(entity, paths[entity])
                )
            connection.execute(
                """
                UPDATE etl_batches
                SET status = 'completed', completed_at = now(), rows_loaded = %s::jsonb
                WHERE source_sha256 = %s
                """,
                (json.dumps(counts), fingerprint),
            )
            return counts
        except Exception as error:
            connection.rollback()
            with connection.transaction():
                connection.execute(
                    """
                    INSERT INTO etl_batches (
                        source_name, source_sha256, status, completed_at, error_message
                    )
                    VALUES ('olist-public-ecommerce', %s, 'failed', now(), %s)
                    ON CONFLICT (source_sha256) DO UPDATE
                    SET status = 'failed',
                        completed_at = now(),
                        error_message = EXCLUDED.error_message
                    """,
                    (fingerprint, str(error)[:1000]),
                )
            raise
