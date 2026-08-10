from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Query, Request
from pydantic import BaseModel, model_validator

from app.repositories.analytics import AnalyticsRepository
from app.services.analytics import AnalyticsService


class AnalyticsFilters(BaseModel):
    start_date: date = date(2017, 9, 1)
    end_date: date = date(2018, 8, 31)
    state: str | None = None
    category: str | None = None
    seller_id: UUID | None = None

    @model_validator(mode="after")
    def validate_period(self) -> "AnalyticsFilters":
        if self.start_date > self.end_date:
            raise ValueError("start_date must be on or before end_date")
        if (self.end_date - self.start_date).days > 1_100:
            raise ValueError("date range cannot exceed 1100 days")
        return self


def get_filters(
    start_date: Annotated[date, Query()] = date(2017, 9, 1),
    end_date: Annotated[date, Query()] = date(2018, 8, 31),
    state: Annotated[str | None, Query(min_length=2, max_length=2, pattern="^[A-Z]{2}$")] = None,
    category: Annotated[str | None, Query(min_length=1, max_length=80)] = None,
    seller_id: Annotated[UUID | None, Query()] = None,
) -> AnalyticsFilters:
    return AnalyticsFilters(
        start_date=start_date,
        end_date=end_date,
        state=state,
        category=category,
        seller_id=seller_id,
    )


def get_service(request: Request) -> AnalyticsService:
    repository = AnalyticsRepository(request.app.state.database)
    return AnalyticsService(repository)


FiltersDependency = Annotated[AnalyticsFilters, Depends(get_filters)]
ServiceDependency = Annotated[AnalyticsService, Depends(get_service)]
LimitDependency = Annotated[int, Query(ge=1, le=100)]
