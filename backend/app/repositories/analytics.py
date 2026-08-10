import os
from pathlib import Path
from typing import Any, Final

from app.db.pool import Database

QUERY_ROOT: Final = Path(
    os.getenv(
        "QUERY_ROOT",
        str(Path(__file__).resolve().parents[3] / "database" / "queries"),
    )
)
QUERY_FILES: Final[dict[str, str]] = {
    "kpis": "overview/kpis.sql",
    "monthly_revenue": "sales/monthly_revenue.sql",
    "category_performance": "products/category_performance.sql",
    "purchase_behavior": "customers/purchase_behavior.sql",
    "seller_performance": "sellers/performance.sql",
    "cohort_retention": "retention/cohort_retention.sql",
    "review_impact": "delivery/review_impact.sql",
}


class QueryNotFoundError(ValueError):
    pass


class AnalyticsRepository:
    def __init__(self, database: Database, query_root: Path = QUERY_ROOT) -> None:
        self._database = database
        self._query_root = query_root
        self._cache: dict[str, str] = {}

    def _load_query(self, name: str) -> str:
        if name not in QUERY_FILES:
            raise QueryNotFoundError(f"Unknown analytics query: {name}")
        if name not in self._cache:
            path = self._query_root / QUERY_FILES[name]
            self._cache[name] = path.read_text(encoding="utf-8")
        return self._cache[name]

    def fetch_all(self, name: str, parameters: dict[str, object]) -> list[dict[str, Any]]:
        query = self._load_query(name)
        with self._database.connection() as connection:
            rows = connection.execute(query, parameters).fetchall()
        return [dict(row) for row in rows]

    def fetch_one(self, name: str, parameters: dict[str, object]) -> dict[str, Any]:
        rows = self.fetch_all(name, parameters)
        return rows[0] if rows else {}
