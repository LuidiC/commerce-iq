import logging
from pathlib import Path

from pytest import LogCaptureFixture

from commerceiq_etl.transform import (
    RowTransformError,
    decimal_number,
    geolocation_rows,
    integer,
    nullable,
    zero_as_null_decimal,
)


def test_nullable_normalizes_blanks() -> None:
    assert nullable("  ") is None
    assert nullable(" value ") == "value"


def test_numeric_transformers_handle_csv_numbers() -> None:
    assert integer("3.0") == 3
    assert decimal_number("12.50") == "12.50"


def test_integer_rejects_fractional_values_instead_of_truncating() -> None:
    try:
        integer("3.9")
    except RowTransformError:
        pass
    else:
        raise AssertionError("Fractional integer input must be rejected")


def test_decimal_rejects_non_finite_values() -> None:
    try:
        decimal_number("NaN")
    except RowTransformError:
        pass
    else:
        raise AssertionError("NaN must be rejected")


def test_zero_product_dimension_is_normalized_to_null() -> None:
    assert zero_as_null_decimal("0") is None
    assert zero_as_null_decimal("25.5") == "25.5"
    assert zero_as_null_decimal("-1") == "-1"


def test_geolocation_filter_reports_rows_outside_brazil_bounds(
    tmp_path: Path, caplog: LogCaptureFixture
) -> None:
    source = tmp_path / "geolocation.csv"
    source.write_text(
        "geolocation_zip_code_prefix,geolocation_lat,geolocation_lng,"
        "geolocation_city,geolocation_state\n"
        "01001,-23.55,-46.63,sao paulo,SP\n"
        "01002,40.71,-74.00,new york,NY\n",
        encoding="utf-8",
    )

    with caplog.at_level(logging.WARNING, logger="commerceiq.etl"):
        result = list(geolocation_rows(source))

    assert len(result) == 1
    assert caplog.records[0].message == "geolocation_rows_outside_bounds"
    assert caplog.records[0].rows == 1  # type: ignore[attr-defined]
