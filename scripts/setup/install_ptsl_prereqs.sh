#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ "${SKIP_PIP_INSTALL:-0}" == "1" ]]; then
  echo "[1/3] Skipping dependency install (SKIP_PIP_INSTALL=1)"
else
  echo "[1/3] Installing backend Python dependencies..."
  python3 -m pip install -r backend/requirements.txt
fi

echo "[2/3] Validating py-ptsl runtime..."
python3 - <<'PY'
import importlib.metadata as metadata

try:
    import ptsl
    from ptsl import PTSL_pb2
except Exception as exc:  # pragma: no cover
    raise SystemExit(
        "ERROR: py-ptsl is not usable. "
        "Install access-approved SDK/runtime first, then rerun. "
        f"Details: {exc}"
    )

try:
    version = metadata.version("py-ptsl")
except metadata.PackageNotFoundError:
    version = "unknown"

required_attrs = ["EM_AudioInfo", "BitDepth", "SampleRate"]
missing = [name for name in required_attrs if not hasattr(PTSL_pb2, name)]
if missing:
    raise SystemExit(
        "ERROR: ptsl.PTSL_pb2 is missing required attributes: " + ", ".join(missing)
    )

print(f"OK: py-ptsl version {version}")
print("OK: ptsl.PTSL_pb2 protobuf bindings available")
PY

PROTO_DEST="docs/protocol/PTSL.proto"

if [[ -n "${PTSL_PROTO_SOURCE:-}" ]]; then
  echo "[3/3] Copying local PTSL.proto from SDK path..."
  if [[ ! -f "$PTSL_PROTO_SOURCE" ]]; then
    echo "ERROR: PTSL_PROTO_SOURCE does not exist: $PTSL_PROTO_SOURCE" >&2
    exit 1
  fi
  cp "$PTSL_PROTO_SOURCE" "$PROTO_DEST"
  echo "OK: copied to $PROTO_DEST"
elif [[ -f "$PROTO_DEST" ]]; then
  echo "[3/3] Local PTSL.proto already present at $PROTO_DEST"
else
  echo "[3/3] Skipping optional PTSL.proto copy (runtime is still ready)"
fi

echo "Done. Track2Do backend PTSL prerequisites are ready."
