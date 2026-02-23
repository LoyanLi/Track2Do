# PTSL SDK Setup (Required for Pro Tools Integration)

Track2Do uses the `py-ptsl` package at runtime and does **not** vendor Avid SDK protocol files in this repository.

## Why Protocol Files Are Not Included

Avid's PTSL SDK materials are license-controlled. Keep SDK/proto artifacts local and out of public repositories.

## Official Links

- Avid Scripting SDK portal: https://developer.avid.com/scripting/
- Avid Pro Tools Scripting SDK FAQ: https://kb.avid.com/pkb/articles/en_US/Knowledge/Pro-Tools-Scripting-SDK-FAQ
- py-ptsl package (Python runtime dependency): https://pypi.org/project/py-ptsl/

## One-Command Local Setup

From the project root:

```bash
./scripts/setup/install_ptsl_prereqs.sh
```

This script will:

1. Install backend Python dependencies from `backend/requirements.txt`.
2. Validate that `py-ptsl` and `ptsl.PTSL_pb2` are importable.
3. Optionally copy `PTSL.proto` to `docs/protocol/PTSL.proto` if you provide a local SDK path.

For offline/local validation without reinstalling dependencies:

```bash
SKIP_PIP_INSTALL=1 ./scripts/setup/install_ptsl_prereqs.sh
```

## Optional: Add Local `PTSL.proto` Reference Copy

If you downloaded the SDK and want a local protocol reference file:

```bash
PTSL_PROTO_SOURCE="/absolute/path/to/PTSL.proto" ./scripts/setup/install_ptsl_prereqs.sh
```

The copied file stays local and is ignored by git.
