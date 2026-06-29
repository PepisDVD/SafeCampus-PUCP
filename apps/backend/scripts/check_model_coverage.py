"""
Compare SQLAlchemy declarative models against the remote database catalog.

This script is intentionally read-only. It helps keep backend models aligned
with the multi-schema Supabase/Postgres database without overwriting curated
models.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from dataclasses import dataclass

from alembic.migration import MigrationContext
from sqlalchemy import Column, inspect

from app.core.database import Base, engine
from app.models import *  # noqa: F403 - importing registers models in Base.metadata

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


@dataclass(frozen=True)
class ColumnMismatch:
    schema: str
    table: str
    column: str
    detail: str


def _inspect_database(connection):
    inspector = inspect(connection)
    tables: set[tuple[str, str]] = set()
    for schema in SCHEMAS:
        for table_name in inspector.get_table_names(schema=schema):
            tables.add((schema, table_name))

    modeled_tables = _modeled_tables()
    mismatches: list[ColumnMismatch] = []
    migration_context = MigrationContext.configure(connection)

    for schema, table_name in sorted(tables & modeled_tables):
        model_table = Base.metadata.tables[f"{schema}.{table_name}"]
        inspected_columns = {
            column["name"]: column for column in inspector.get_columns(table_name, schema=schema)
        }
        database_columns = set(inspected_columns)
        model_columns = set(model_table.columns.keys())

        for column_name in sorted(database_columns - model_columns):
            mismatches.append(ColumnMismatch(schema, table_name, column_name, "missing in model"))
        for column_name in sorted(model_columns - database_columns):
            mismatches.append(
                ColumnMismatch(schema, table_name, column_name, "missing in database")
            )

        for column_name in sorted(database_columns & model_columns):
            inspected_column = inspected_columns[column_name]
            database_column = Column(
                column_name,
                inspected_column["type"],
                nullable=inspected_column["nullable"],
            )
            model_column = model_table.columns[column_name]
            if database_column.nullable != model_column.nullable:
                mismatches.append(
                    ColumnMismatch(
                        schema,
                        table_name,
                        column_name,
                        "nullable differs "
                        f"(database={database_column.nullable}, model={model_column.nullable})",
                    )
                )
            if migration_context.impl.compare_type(database_column, model_column):
                mismatches.append(
                    ColumnMismatch(
                        schema,
                        table_name,
                        column_name,
                        "type differs "
                        f"(database={database_column.type}, model={model_column.type})",
                    )
                )

    return tables, mismatches


async def main() -> int:
    async with engine.connect() as connection:
        database_tables, column_mismatches = await connection.run_sync(_inspect_database)

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
    print(f"  Column issues:   {len(column_mismatches)}")

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

    if column_mismatches:
        print("\nColumn mismatches:")
        for mismatch in column_mismatches:
            print(f"  {mismatch.schema}.{mismatch.table}.{mismatch.column}: {mismatch.detail}")

    return 1 if missing or extra or column_mismatches else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
