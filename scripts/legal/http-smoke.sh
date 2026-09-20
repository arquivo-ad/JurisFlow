#!/usr/bin/env bash

set -u

test_url() {
    local name="$1"
    local url="$2"

    echo
    echo "=================================================="
    echo "$name"
    echo "$url"
    echo "=================================================="

    curl \
        --location \
        --silent \
        --show-error \
        --connect-timeout 10 \
        --max-time 30 \
        --output /tmp/jurisflow-http-body \
        --write-out \
        'HTTP=%{http_code} TYPE=%{content_type} SIZE=%{size_download} REDIRECT=%{redirect_url} TIME=%{time_total}s\n' \
        "$url"

    local rc=$?

    if [[ "$rc" -ne 0 ]]; then
        echo "FAIL curl=$rc"
    else
        echo "PASS transport"
    fi

    return "$rc"
}

test_url \
  "STF - Repercussao Geral" \
  "https://portal.stf.jus.br/repercussaogeral/"

test_url \
  "STF - Todos os temas" \
  "https://portal.stf.jus.br/jurisprudenciaRepercussao/todostemas.asp"

test_url \
  "STF - Teses" \
  "https://portal.stf.jus.br/repercussaogeral/teses.asp"

