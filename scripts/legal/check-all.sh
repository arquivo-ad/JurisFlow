#!/usr/bin/env bash

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT"

echo
echo "========================================"
echo " 1. TYPESCRIPT / BUILD"
echo "========================================"

if npm run | grep -q 'typecheck'; then
    npm run typecheck
elif npm run | grep -q 'check'; then
    npm run check
else
    echo "Nenhum script typecheck/check encontrado."
fi

echo
echo "========================================"
echo " 2. TESTS"
echo "========================================"

if npm run | grep -q 'test'; then
    npm test -- --run || npm test
else
    echo "Nenhum npm test configurado."
fi

echo
echo "========================================"
echo " 3. HTTP SMOKE"
echo "========================================"

"$ROOT/scripts/legal/http-smoke.sh"

echo
echo "========================================"
echo " 4. SOURCE REGISTRY"
echo "========================================"

grep -nE \
    'TRT2|TJSP|TRF3|STF|STJ|TST|DJEN|DataJud' \
    "$ROOT/server/legal/sourceRegistry.ts" \
    || true

echo
echo "========================================"
echo " CHECK COMPLETE"
echo "========================================"
