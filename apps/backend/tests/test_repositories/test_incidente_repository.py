from datetime import UTC, datetime

import pytest
from sqlalchemy.dialects import postgresql

from app.repositories.incidente_repository import IncidenteRepository


class _EmptyMappingsResult:
    def mappings(self):
        return self

    def __iter__(self):
        return iter(())


class _RecordingSession:
    def __init__(self) -> None:
        self.statement = None

    async def execute(self, statement):
        self.statement = statement
        return _EmptyMappingsResult()


@pytest.mark.anyio
async def test_count_por_tipo_groups_by_category_column() -> None:
    session = _RecordingSession()
    repository = IncidenteRepository(session)  # type: ignore[arg-type]

    await repository.get_count_por_tipo(
        datetime(2026, 6, 1, tzinfo=UTC),
        datetime(2026, 6, 8, tzinfo=UTC),
    )

    sql = str(
        session.statement.compile(  # type: ignore[union-attr]
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )

    assert "coalesce(sc_incidentes.incidente.categoria, 'otro') AS tipo" in sql
    assert "GROUP BY sc_incidentes.incidente.categoria" in sql
