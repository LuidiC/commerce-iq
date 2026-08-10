from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from app.services.analytics import AnalyticsService


class StubRepository:
    def fetch_one(self, name: str, parameters: dict[str, object]) -> dict[str, object]:
        if name == "kpis":
            current = parameters["start_date"] == date(2018, 1, 1)
            factor = 2 if current else 1
            return {
                "revenue": Decimal("100.00") * factor,
                "orders": 10 * factor,
                "average_order_value": Decimal("10.00"),
                "customers": 8 * factor,
                "average_review_score": Decimal("4.00"),
            }
        return {
            "customers": 16,
            "repeat_customers": 2,
            "repeat_customer_rate_pct": Decimal("12.50"),
            "average_days_between_purchases": Decimal("42.00"),
            "high_value_customers": 1,
        }

    def fetch_all(self, name: str, parameters: dict[str, object]) -> list[dict[str, object]]:
        return []


def test_overview_compares_with_equal_previous_period() -> None:
    service = AnalyticsService(StubRepository())  # type: ignore[arg-type]
    filters = SimpleNamespace(
        start_date=date(2018, 1, 1),
        end_date=date(2018, 1, 31),
        state=None,
        category=None,
        seller_id=None,
    )

    overview = service.overview(filters)

    assert overview.kpis.revenue.value == Decimal("200.00")
    assert overview.kpis.revenue.previous_value == Decimal("100.00")
    assert overview.kpis.revenue.change_pct == Decimal("100.00")


def test_review_comparison_preserves_missing_values() -> None:
    comparison = AnalyticsService._comparison(None, None, null_as_zero=False)

    assert comparison.value is None
    assert comparison.previous_value is None
    assert comparison.change_pct is None
