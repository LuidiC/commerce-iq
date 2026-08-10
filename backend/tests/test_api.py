from datetime import date
from decimal import Decimal

from fastapi.testclient import TestClient

from app.api.dependencies import get_service
from app.main import app
from app.schemas.analytics import (
    CustomerBehavior,
    KpiSet,
    MetricDelta,
    OverviewResponse,
)


class StubService:
    def overview(self, filters: object) -> OverviewResponse:
        metric = MetricDelta(
            value=Decimal("10"),
            previous_value=Decimal("8"),
            change_pct=Decimal("25"),
        )
        return OverviewResponse(
            period_start=date(2018, 1, 1),
            period_end=date(2018, 1, 31),
            kpis=KpiSet(
                revenue=metric,
                orders=metric,
                average_order_value=metric,
                customers=metric,
                average_review_score=metric,
            ),
            revenue_trend=[],
            top_categories=[],
            customer_behavior=CustomerBehavior(
                customers=10,
                repeat_customers=1,
                repeat_customer_rate_pct=Decimal("10"),
                average_days_between_purchases=None,
                high_value_customers=2,
            ),
            delivery_impact=[],
        )


def test_overview_endpoint_returns_typed_payload() -> None:
    app.dependency_overrides[get_service] = lambda: StubService()
    client = TestClient(app)
    try:
        response = client.get(
            "/api/v1/overview",
            params={"start_date": "2018-01-01", "end_date": "2018-01-31"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["kpis"]["revenue"]["change_pct"] == "25"


def test_overview_endpoint_rejects_invalid_state() -> None:
    app.dependency_overrides[get_service] = lambda: StubService()
    client = TestClient(app)
    try:
        response = client.get("/api/v1/overview", params={"state": "SÃO PAULO"})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
