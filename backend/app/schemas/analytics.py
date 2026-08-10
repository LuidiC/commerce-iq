from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MetricDelta(ApiModel):
    value: Decimal | int
    previous_value: Decimal | int
    change_pct: Decimal | None


class KpiSet(ApiModel):
    revenue: MetricDelta
    orders: MetricDelta
    average_order_value: MetricDelta
    customers: MetricDelta
    average_review_score: MetricDelta


class MonthlyRevenue(ApiModel):
    month: date
    revenue: Decimal
    orders: int
    month_over_month_pct: Decimal | None
    cumulative_revenue: Decimal
    revenue_moving_average_3m: Decimal
    next_revenue: Decimal | None = Field(exclude=True)


class CategoryPerformance(ApiModel):
    category: str
    revenue: Decimal
    orders: int
    items: int
    average_review_score: Decimal | None
    revenue_rank: int
    revenue_share_pct: Decimal


class CustomerBehavior(ApiModel):
    customers: int
    repeat_customers: int
    repeat_customer_rate_pct: Decimal
    average_days_between_purchases: Decimal | None
    high_value_customers: int


class SellerPerformance(ApiModel):
    seller_id: UUID
    state: str
    revenue: Decimal
    orders: int
    average_order_value: Decimal
    average_review_score: Decimal | None
    revenue_rank: int


class CohortRetention(ApiModel):
    cohort_month: date
    month_number: int
    cohort_size: int
    active_customers: int
    retention_rate_pct: Decimal


class DeliveryImpact(ApiModel):
    delivery_status: str
    orders: int
    average_delivery_days: Decimal
    average_review_score: Decimal | None
    order_share_pct: Decimal


class OverviewResponse(ApiModel):
    period_start: date
    period_end: date
    kpis: KpiSet
    revenue_trend: list[MonthlyRevenue]
    top_categories: list[CategoryPerformance]
    customer_behavior: CustomerBehavior
    delivery_impact: list[DeliveryImpact]
