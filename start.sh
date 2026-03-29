#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  else
    echo "No .env.example found; skipping .env creation"
  fi
fi

pnpm install
pnpm fonts:prepare
pnpm hardhat compile
pnpm hardhat run scripts/render-svg.mjs
