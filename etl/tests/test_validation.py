from pathlib import Path

import pytest

from commerceiq_etl.contracts import SourceContract
from commerceiq_etl.validation import DatasetValidationError, validate_header


def test_validate_header_accepts_exact_contract(tmp_path: Path) -> None:
    source = tmp_path / "source.csv"
    source.write_text("id,name\n1,example\n", encoding="utf-8")

    validate_header(source, SourceContract("source.csv", ("id", "name")))


def test_validate_header_rejects_schema_drift(tmp_path: Path) -> None:
    source = tmp_path / "source.csv"
    source.write_text("name,id\nexample,1\n", encoding="utf-8")

    with pytest.raises(DatasetValidationError, match="Unexpected columns"):
        validate_header(source, SourceContract("source.csv", ("id", "name")))
