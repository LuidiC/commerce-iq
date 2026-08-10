import csv
import hashlib
from pathlib import Path

from commerceiq_etl.contracts import CONTRACTS, SourceContract


class DatasetValidationError(ValueError):
    pass


def validate_header(path: Path, contract: SourceContract) -> None:
    if not path.is_file():
        raise DatasetValidationError(f"Missing required dataset file: {path.name}")
    with path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.reader(source)
        header = tuple(next(reader, ()))
    if header != contract.columns:
        raise DatasetValidationError(
            f"Unexpected columns in {path.name}. Expected {contract.columns}, received {header}."
        )


def validate_dataset(data_dir: Path) -> dict[str, Path]:
    paths: dict[str, Path] = {}
    for name, contract in CONTRACTS.items():
        path = data_dir / contract.filename
        validate_header(path, contract)
        paths[name] = path
    return paths


def dataset_fingerprint(paths: dict[str, Path]) -> str:
    digest = hashlib.sha256()
    for name, path in sorted(paths.items()):
        digest.update(name.encode())
        with path.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(chunk)
    return digest.hexdigest()
