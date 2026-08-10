from commerceiq_etl.transform import RowTransformError, decimal_number, integer, nullable


def test_nullable_normalizes_blanks() -> None:
    assert nullable("  ") is None
    assert nullable(" value ") == "value"


def test_numeric_transformers_handle_csv_numbers() -> None:
    assert integer("3.0") == 3
    assert decimal_number("12.50") == "12.50"


def test_decimal_rejects_non_finite_values() -> None:
    try:
        decimal_number("NaN")
    except RowTransformError:
        pass
    else:
        raise AssertionError("NaN must be rejected")
