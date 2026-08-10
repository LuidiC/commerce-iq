from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Protocol
from uuid import UUID

from app.repositories.analytics import AnalyticsRepository
from app.schemas.analytics import (
    CategoryPerformance,
    CohortRetention,
    CustomerBehavior,
    DeliveryImpact,
    KpiSet,
    MetricDelta,
    MonthlyRevenue,
    OverviewResponse,
    SellerPerformance,
)


class AnalyticsFilter(Protocol):
    start_date: date
    end_date: date
    state: str | None
    category: str | None
    seller_id: UUID | None


class AnalyticsService:
    def __init__(self, repository: AnalyticsRepository) -> None:
        self._repository = repository

    @staticmethod
    def _comparison(value: Any, previous: Any) -> MetricDelta:
        current_value = value or 0
        previous_value = previous or 0
        change = None
        if previous_value != 0:
            change = (Decimal(str(current_value)) - Decimal(str(previous_value))) * Decimal(100)
            change /= Decimal(str(previous_value))
            change = change.quantize(Decimal("0.01"))
        return MetricDelta(
            value=current_value,
            previous_value=previous_value,
            change_pct=change,
        )

    @staticmethod
    def _parameters(filters: AnalyticsFilter, *, limit: int = 10) -> dict[str, object]:
        return {
            "start_date": filters.start_date,
            "end_date": filters.end_date + timedelta(days=1),
            "state": filters.state,
            "category": filters.category,
            "seller_id": filters.seller_id,
            "limit": limit,
        }

    def overview(self, filters: AnalyticsFilter) -> OverviewResponse:
        current_parameters = self._parameters(filters)
        period_days = (filters.end_date - filters.start_date).days + 1
        previous_end = filters.start_date
        previous_parameters = {
            **current_parameters,
            "start_date": previous_end - timedelta(days=period_days),
            "end_date": previous_end,
        }
        current = self._repository.fetch_one("kpis", current_parameters)
        previous = self._repository.fetch_one("kpis", previous_parameters)

        kpis = KpiSet(
            **{
                key: self._comparison(current.get(key), previous.get(key))
                for key in (
                    "revenue",
                    "orders",
                    "average_order_value",
                    "customers",
                    "average_review_score",
                )
            }
        )
        trends = self._repository.fetch_all("monthly_revenue", current_parameters)
        categories = self._repository.fetch_all("category_performance", current_parameters)
        customers = self._repository.fetch_one("purchase_behavior", current_parameters)
        delivery = self._repository.fetch_all("review_impact", current_parameters)

        return OverviewResponse(
            period_start=filters.start_date,
            period_end=filters.end_date,
            kpis=kpis,
            revenue_trend=[MonthlyRevenue.model_validate(row) for row in trends],
            top_categories=[CategoryPerformance.model_validate(row) for row in categories],
            customer_behavior=CustomerBehavior.model_validate(customers),
            delivery_impact=[DeliveryImpact.model_validate(row) for row in delivery],
        )

    def sales(self, filters: AnalyticsFilter) -> list[MonthlyRevenue]:
        rows = self._repository.fetch_all("monthly_revenue", self._parameters(filters))
        return [MonthlyRevenue.model_validate(row) for row in rows]

    def customers(self, filters: AnalyticsFilter) -> CustomerBehavior:
        row = self._repository.fetch_one("purchase_behavior", self._parameters(filters))
        return CustomerBehavior.model_validate(row)

    def products(self, filters: AnalyticsFilter, limit: int) -> list[CategoryPerformance]:
        rows = self._repository.fetch_all(
            "category_performance", self._parameters(filters, limit=limit)
        )
        return [CategoryPerformance.model_validate(row) for row in rows]

    def sellers(self, filters: AnalyticsFilter, limit: int) -> list[SellerPerformance]:
        rows = self._repository.fetch_all(
            "seller_performance", self._parameters(filters, limit=limit)
        )
        return [SellerPerformance.model_validate(row) for row in rows]

    def retention(self, filters: AnalyticsFilter) -> list[CohortRetention]:
        rows = self._repository.fetch_all("cohort_retention", self._parameters(filters))
        return [CohortRetention.model_validate(row) for row in rows]

    def delivery(self, filters: AnalyticsFilter) -> list[DeliveryImpact]:
        rows = self._repository.fetch_all("review_impact", self._parameters(filters))
        return [DeliveryImpact.model_validate(row) for row in rows]
