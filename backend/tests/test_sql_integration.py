import os
from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID

import pytest

from app.core.config import Settings
from app.db.pool import Database
from app.repositories.analytics import AnalyticsRepository
from app.services.analytics import AnalyticsService

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not TEST_DATABASE_URL, reason="TEST_DATABASE_URL is not configured"),
]


@pytest.fixture(scope="module")
def database() -> Database:
    configured = Database(
        Settings(
            _env_file=None,
            app_database_url=TEST_DATABASE_URL or "",
            db_pool_min_size=1,
            db_pool_max_size=2,
        )
    )
    configured.open()
    try:
        yield configured
    finally:
        configured.close()


@pytest.fixture(scope="module")
def repository(database: Database) -> AnalyticsRepository:
    return AnalyticsRepository(database)


def parameters(*, seller_id: UUID | None = None) -> dict[str, object]:
    filters = SimpleNamespace(
        start_date=date(2017, 9, 1),
        end_date=date(2018, 8, 31),
        state=None,
        category=None,
        seller_id=seller_id,
    )
    return AnalyticsService._parameters(filters, limit=100)


def test_category_revenue_reconciles_to_overview(
    repository: AnalyticsRepository,
) -> None:
    query_parameters = parameters()
    kpis = repository.fetch_one("kpis", query_parameters)
    categories = repository.fetch_all("category_performance", query_parameters)

    assert len(categories) == 74
    assert sum((row["revenue"] for row in categories), Decimal(0)) == kpis["revenue"]


def test_delivery_shares_use_order_grain(
    database: Database, repository: AnalyticsRepository
) -> None:
    delivery = repository.fetch_all("review_impact", parameters())
    with database.connection() as connection:
        expected = connection.execute(
            """
            SELECT COUNT(*) AS orders
            FROM orders
            WHERE status = 'delivered'
              AND delivered_to_customer_at IS NOT NULL
              AND purchased_at >= DATE '2017-09-01'
              AND purchased_at < DATE '2018-09-01'
            """
        ).fetchone()

    assert expected is not None
    assert sum(row["orders"] for row in delivery) == expected["orders"]
    assert sum((row["order_share_pct"] for row in delivery), Decimal(0)) == Decimal("100.00")


def test_empty_period_returns_defined_aggregates(
    repository: AnalyticsRepository,
) -> None:
    empty_parameters = {
        **parameters(),
        "start_date": date(2016, 1, 1),
        "end_date": date(2016, 2, 1),
    }

    kpis = repository.fetch_one("kpis", empty_parameters)
    customers = repository.fetch_one("purchase_behavior", empty_parameters)
    monthly = repository.fetch_all("monthly_revenue", empty_parameters)

    assert kpis["orders"] == 0
    assert kpis["average_review_score"] is None
    assert customers["repeat_customer_rate_pct"] == Decimal("0")
    assert len(monthly) == 1
    assert monthly[0]["revenue"] == Decimal("0.00")


def test_month_over_month_does_not_jump_across_missing_calendar_months(
    database: Database, repository: AnalyticsRepository
) -> None:
    with database.connection() as connection:
        seller = connection.execute(
            """
            WITH seller_months AS (
                SELECT
                    order_items.seller_id,
                    date_trunc('month', orders.purchased_at)::date AS month
                FROM orders
                INNER JOIN order_items USING (order_id)
                WHERE orders.status = 'delivered'
                  AND orders.purchased_at >= DATE '2017-09-01'
                  AND orders.purchased_at < DATE '2018-09-01'
                GROUP BY order_items.seller_id, date_trunc('month', orders.purchased_at)
            )
            SELECT seller_id
            FROM seller_months
            GROUP BY seller_id
            HAVING COUNT(*) < (
                EXTRACT(YEAR FROM age(MAX(month), MIN(month))) * 12
                + EXTRACT(MONTH FROM age(MAX(month), MIN(month))) + 1
            )
            ORDER BY seller_id
            LIMIT 1
            """
        ).fetchone()

    assert seller is not None
    monthly = repository.fetch_all(
        "monthly_revenue", parameters(seller_id=seller["seller_id"])
    )

    assert len(monthly) == 12
    assert any(row["revenue"] == 0 for row in monthly)
    for previous, current in zip(monthly, monthly[1:], strict=False):
        if previous["revenue"] == 0 and current["revenue"] > 0:
            assert current["month_over_month_pct"] is None
