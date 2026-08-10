from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.config import Settings


class Database:
    def __init__(self, settings: Settings) -> None:
        self._pool = ConnectionPool(
            conninfo=settings.app_database_url,
            min_size=settings.db_pool_min_size,
            max_size=settings.db_pool_max_size,
            open=False,
            kwargs={
                "row_factory": dict_row,
                "options": f"-c statement_timeout={settings.db_statement_timeout_ms}",
            },
        )

    def open(self) -> None:
        self._pool.open(wait=True, timeout=10)

    def close(self) -> None:
        self._pool.close()

    @contextmanager
    def connection(self) -> Iterator[Connection[Any]]:
        with self._pool.connection() as connection, connection.transaction():
            connection.execute("SET TRANSACTION READ ONLY")
            yield connection

    def is_healthy(self) -> bool:
        try:
            with self.connection() as connection:
                result = connection.execute("SELECT 1 AS healthy").fetchone()
            return bool(result and result["healthy"] == 1)
        except Exception:
            return False
