#!/usr/bin/env bash

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

FAILED=0

run_step() {
    local title="$1"
    shift

    echo
    echo "=================================================="
    echo "$title"
    echo "=================================================="

    if "$@"; then
        echo
        echo "[PASS] $title"
    else
        echo
        echo "[FAIL] $title"
        FAILED=1
    fi
}

run_step \
    "1. TYPESCRIPT / LINT" \
    npm run lint

run_step \
    "2. LEGAL TEST SUITE" \
    npm run test:legal

run_step \
    "3. CONNECTOR REGRESSION TESTS" \
    npm run test:connectors

run_step \
    "4. PRODUCTION BUILD" \
    npm run build

echo
echo "=================================================="
echo "5. SOURCE REGISTRY STATUS"
echo "=================================================="

grep -nE \
    'TRT2|TJSP|TRF3|STF|STJ|TST|DJEN|DATAJUD|DataJud|BNP|Pangea' \
    server/legal/sourceRegistry.ts \
    || true

echo
echo "=================================================="

if [[ "$FAILED" -eq 0 ]]; then
    echo "ALL CHECKS PASSED"
    exit 0
fi

echo "ONE OR MORE CHECKS FAILED"
exit 1
