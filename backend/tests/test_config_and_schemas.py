from uuid import UUID

import pytest
from pydantic import ValidationError
from pytest import MonkeyPatch

from app.core.config import Settings
from app.schemas.analytics import SellerPerformance


def test_cors_origins_accepts_documented_comma_separated_environment_value(
    monkeypatch: MonkeyPatch,
) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000,https://example.test")

    settings = Settings(_env_file=None)

    assert settings.cors_origins == ["http://localhost:3000", "https://example.test"]


def test_cors_origins_rejects_wildcard(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "*")

    with pytest.raises(ValidationError, match="must not contain a wildcard"):
        Settings(_env_file=None)


def test_seller_performance_serializes_database_uuid_as_a_json_string() -> None:
    seller_id = UUID("4869f7a5-dfa2-77a7-dca6-462dcf3b52b2")
    seller = SellerPerformance.model_validate(
        {
            "seller_id": seller_id,
            "state": "SP",
            "revenue": "100.00",
            "orders": 1,
            "average_order_value": "100.00",
            "average_review_score": "4.00",
            "revenue_rank": 1,
        }
    )

    assert seller.model_dump(mode="json")["seller_id"] == str(seller_id)
