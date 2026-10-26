#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/embed-assets.mjs
node scripts/validate-artifact.mjs
