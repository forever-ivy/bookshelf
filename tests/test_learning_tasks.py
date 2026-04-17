from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from textwrap import dedent


def test_learning_worker_runtime_imports_foreign_key_models():
    project_root = Path(__file__).resolve().parents[1]
    script = dedent(
        """
        from sqlalchemy.sql.ddl import sort_tables

        from app.db.base import Base
        import app.learning.models as learning_models
        from app.learning.tasks import prepare_learning_worker_runtime

        assert "reader_profiles" not in Base.metadata.tables

        try:
            sort_tables([learning_models.LearningProfile.__table__])
        except Exception as exc:
            print(type(exc).__name__)
        else:
            raise SystemExit("expected metadata sort to fail before worker runtime preparation")

        prepare_learning_worker_runtime()

        assert "reader_profiles" in Base.metadata.tables
        sort_tables([learning_models.LearningProfile.__table__])
        print("worker-runtime-ok")
        """
    )

    result = subprocess.run(
        [sys.executable, "-c", script],
        cwd=project_root,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr or result.stdout
    assert "NoReferencedTableError" in result.stdout
    assert "worker-runtime-ok" in result.stdout
