#!/usr/bin/env bash
# Prepares a git worktree to run its own Compose stack beside the main checkout.
# It writes two ignored files: .env with a unique project name and port, and
# compose.override.yaml, which drops the fixed container names that would
# otherwise collide. compose.yaml itself keeps the names the course requires.
# Usage: bash scripts/worktree-stack.sh [port]
set -euo pipefail

root=$(git rev-parse --show-toplevel)
cd "$root"

if [ "$root" = "$(git worktree list --porcelain | sed -n '1s/^worktree //p')" ]; then
  echo "This is the main checkout; it runs the stack with the documented names." >&2
  exit 1
fi

port_is_free() {
  ! (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
}

port=${1:-}
if [ -z "$port" ]; then
  port=8001
  until port_is_free "$port"; do
    port=$((port + 1))
  done
fi

project="okane-$(basename "$root" | tr -c 'a-z0-9\n' '-')"

[ -f .env ] || cp .env.example .env
sed -i '/^COMPOSE_PROJECT_NAME=/d; /^WEBAPP_PORT=/d' .env
printf 'COMPOSE_PROJECT_NAME=%s\nWEBAPP_PORT=%s\n' "$project" "$port" >>.env

cat >compose.override.yaml <<'YAML'
# Written by scripts/worktree-stack.sh for this worktree only; never commit it.
services:
  webapp:
    container_name: !reset null
  webapp-db:
    container_name: !reset null
  api-service:
    container_name: !reset null
  api-db:
    container_name: !reset null
YAML

echo "Project $project will serve http://localhost:$port"
echo "Start it with: docker compose up --build --detach --wait"
