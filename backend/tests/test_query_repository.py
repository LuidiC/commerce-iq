from pathlib import Path

import pytest

from app.repositories.analytics import AnalyticsRepository, QueryNotFoundError


class UnusedDatabase:
    pass


def test_query_loader_rejects_arbitrary_paths(tmp_path: Path) -> None:
    repository = AnalyticsRepository(UnusedDatabase(), query_root=tmp_path)  # type: ignore[arg-type]

    with pytest.raises(QueryNotFoundError, match="Unknown analytics query"):
        repository._load_query("../../secrets")
