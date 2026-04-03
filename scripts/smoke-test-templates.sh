#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cli_path="${CREATE_CANTON_APP_CLI:-$repo_root/bin/create-canton-app.js}"
sdk_version="${DPM_SDK_VERSION:-3.4.9}"

templates=("$@")
if [[ ${#templates[@]} -eq 0 ]]; then
  templates=(TokenTransfer Multiparty AssetOwner)
fi

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
}

require_command node
require_command dpm
require_command java

echo "Ensuring DPM SDK $sdk_version is installed..."
dpm install "$sdk_version" >/dev/null

workdir="$(mktemp -d "${TMPDIR:-/tmp}/create-canton-app-smoke-XXXXXX")"

cleanup() {
  local status=$?

  if [[ -d "$workdir" ]]; then
    if [[ $status -ne 0 || "${KEEP_SMOKE_DIR:-0}" == "1" ]]; then
      echo "Smoke workspace preserved at $workdir"
    else
      rm -rf "$workdir"
    fi
  fi
}

trap cleanup EXIT

project_name_for_template() {
  case "$1" in
    TokenTransfer) echo "token-transfer" ;;
    Multiparty) echo "multiparty" ;;
    AssetOwner) echo "asset-owner" ;;
    *)
      echo "Unsupported template: $1" >&2
      exit 1
      ;;
  esac
}

for template in "${templates[@]}"; do
  project_name="$(project_name_for_template "$template")"

  echo
  echo "==> Scaffolding $template"
  (
    cd "$workdir"
    node "$cli_path" "$project_name" --template "$template"
  )

  echo "==> Running dpm test for $template"
  (
    cd "$workdir/$project_name"
    dpm test
  )
done
