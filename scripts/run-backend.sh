#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${1:-8787}"

cd "$ROOT_DIR"
echo "[run-backend] Starting Cat City mock backend on port ${PORT}..."
PORT="$PORT" node backend/mock-backend.js
