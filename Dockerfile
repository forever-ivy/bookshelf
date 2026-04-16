FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml /app/pyproject.toml
COPY README.md /app/README.md
COPY app /app/app
COPY alembic /app/alembic
COPY tests /app/tests

RUN uv pip install --system -e .

CMD ["uv", "run", "library-core-api"]
