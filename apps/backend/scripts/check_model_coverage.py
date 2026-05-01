"""
Compare SQLAlchemy declarative models against the remote database catalog.

This script is intentionally read-only. It helps keep backend models aligned
with the multi-schema Supabase/Postgres database without overwriting curated
models.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict

from sqlalchemy import inspect

from app.core.database import engine
from app.models import *  # noqa: F403 - importing registers models in Base.metadata
from app.core.database import Base

SCHEMAS = (
    "sc_users",
    "sc_omnicanal",
    "sc_incidentes",
    "sc_clasificacion",
    "sc_notificaciones",
    "sc_dashboard",
    "sc_lost_found",
    "sc_acompanamiento",
    "sc_auditoria",
)


def _modeled_tables() -> set[tuple[str, str]]:
    modeled: set[tuple[str, str]] = set()
    for table in Base.metadata.tables.values():
        if table.schema in SCHEMAS:
            modeled.add((table.schema, table.name))
    return modeled


def _load_database_tables(connection) -> set[tuple[str, str]]:
    inspector = inspect(connection)
    tables: set[tuple[str, str]] = set()
    for schema in SCHEMAS:
        for table_name in inspector.get_table_names(schema=schema):
            tables.add((schema, table_name))
    return tables


async def main() -> int:
    async with engine.connect() as connection:
        database_tables = await connection.run_sync(_load_database_tables)

    modeled_tables = _modeled_tables()
    missing = sorted(database_tables - modeled_tables)
    extra = sorted(modeled_tables - database_tables)

    by_schema: dict[str, list[str]] = defaultdict(list)
    for schema, table in missing:
        by_schema[schema].append(table)

    print("SQLAlchemy model coverage")
    print(f"  Database tables: {len(database_tables)}")
    print(f"  Modeled tables:  {len(modeled_tables)}")
    print(f"  Missing models:  {len(missing)}")
    print(f"  Extra models:    {len(extra)}")

    if missing:
        print("\nMissing models by schema:")
        for schema in SCHEMAS:
            tables = by_schema.get(schema)
            if tables:
                print(f"  {schema}: {', '.join(tables)}")

    if extra:
        print("\nModels without matching database table:")
        for schema, table in extra:
            print(f"  {schema}.{table}")

    return 1 if missing or extra else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
