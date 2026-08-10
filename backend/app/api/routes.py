from fastapi import APIRouter, HTTPException, Request, status

from app.api.dependencies import FiltersDependency, LimitDependency, ServiceDependency
from app.schemas.analytics import (
    CategoryPerformance,
    CohortRetention,
    CustomerBehavior,
    DeliveryImpact,
    MonthlyRevenue,
    OverviewResponse,
    SellerPerformance,
)

router = APIRouter(prefix="/api/v1")


@router.get("/health", tags=["system"])
def health(request: Request) -> dict[str, str]:
    if not request.app.state.database.is_healthy():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "degraded", "database": "unavailable"},
        )
    return {"status": "ok", "database": "connected"}


@router.get("/overview", response_model=OverviewResponse, tags=["analytics"])
def overview(filters: FiltersDependency, service: ServiceDependency) -> OverviewResponse:
    return service.overview(filters)


@router.get("/sales", response_model=list[MonthlyRevenue], tags=["analytics"])
def sales(filters: FiltersDependency, service: ServiceDependency) -> list[MonthlyRevenue]:
    return service.sales(filters)


@router.get("/customers", response_model=CustomerBehavior, tags=["analytics"])
def customers(filters: FiltersDependency, service: ServiceDependency) -> CustomerBehavior:
    return service.customers(filters)


@router.get("/products", response_model=list[CategoryPerformance], tags=["analytics"])
def products(
    filters: FiltersDependency,
    service: ServiceDependency,
    limit: LimitDependency = 20,
) -> list[CategoryPerformance]:
    return service.products(filters, limit)


@router.get("/sellers", response_model=list[SellerPerformance], tags=["analytics"])
def sellers(
    filters: FiltersDependency,
    service: ServiceDependency,
    limit: LimitDependency = 20,
) -> list[SellerPerformance]:
    return service.sellers(filters, limit)


@router.get("/retention", response_model=list[CohortRetention], tags=["analytics"])
def retention(filters: FiltersDependency, service: ServiceDependency) -> list[CohortRetention]:
    return service.retention(filters)


@router.get("/delivery", response_model=list[DeliveryImpact], tags=["analytics"])
def delivery(filters: FiltersDependency, service: ServiceDependency) -> list[DeliveryImpact]:
    return service.delivery(filters)
