#!/usr/bin/env bash
set -u

command_status() {
  local cmd="$1"
  if command -v "$cmd" >/dev/null 2>&1; then
    printf '[OK]   %-14s %s\n' "$cmd" "$(command -v "$cmd")"
    return 0
  fi
  printf '[MISS] %-14s\n' "$cmd"
  return 1
}

echo "JurisFlow Certificate Bridge - pré-requisitos"
echo

A1_OK=0
A3_OK=0

command_status node || true
if command_status openssl; then A1_OK=1; fi
command_status p11-kit || true

if command_status pkcs11-tool; then A3_OK=$((A3_OK+1)); fi
if command_status opensc-tool; then A3_OK=$((A3_OK+1)); fi
command_status pcsc_scan || true

echo
if [[ "$A1_OK" -eq 1 ]]; then
  echo "[READY] A1: inspeção local .p12/.pfx disponível."
else
  echo "[BLOCK] A1: OpenSSL ausente."
fi

if [[ "$A3_OK" -eq 2 ]]; then
  echo "[READY] A3: OpenSC/PKCS#11 disponível para a próxima etapa."
else
  echo "[BLOCK] A3: OpenSC incompleto."
  echo "        Ubuntu/Debian: sudo apt install opensc pcscd pcsc-tools"
  echo "        Não execute a instalação em máquinas corporativas sem aprovação."
fi

echo
echo "A ponte deve escutar somente em 127.0.0.1:43119."
