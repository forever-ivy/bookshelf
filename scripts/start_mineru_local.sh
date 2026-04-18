#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_DIR="${MINERU_VENV_DIR:-$ROOT_DIR/.venv-mineru-local}"
HOST="${MINERU_HOST:-127.0.0.1}"
PORT="${MINERU_PORT:-8001}"
PYTHON_VERSION="${MINERU_PYTHON:-3.12}"
PACKAGE_SPEC="${MINERU_PACKAGE_SPEC:-mineru[all]}"
MODEL_SOURCE="${MINERU_MODEL_SOURCE:-modelscope}"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required to install and run MinerU locally." >&2
  exit 1
fi

if [ ! -x "$VENV_DIR/bin/python" ]; then
  uv venv "$VENV_DIR" --python "$PYTHON_VERSION"
fi

uv pip install --python "$VENV_DIR/bin/python" -U "$PACKAGE_SPEC"

export MINERU_MODEL_SOURCE="$MODEL_SOURCE"

echo "Starting mineru-api at http://$HOST:$PORT using $VENV_DIR"
exec "$VENV_DIR/bin/mineru-api" --host "$HOST" --port "$PORT"
