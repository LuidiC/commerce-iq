from datetime import date

import pytest
from pydantic import ValidationError

from app.api.dependencies import AnalyticsFilters


def test_filter_rejects_inverted_period() -> None:
    with pytest.raises(ValidationError, match="start_date must be on or before end_date"):
        AnalyticsFilters(start_date=date(2018, 1, 2), end_date=date(2018, 1, 1))


def test_filter_rejects_unbounded_range() -> None:
    with pytest.raises(ValidationError, match="date range cannot exceed 1100 days"):
        AnalyticsFilters(start_date=date(2010, 1, 1), end_date=date(2018, 1, 1))
