#!/usr/bin/env bash
# Checks a running Compose stack against the container skeleton contract:
# webapp serves the frontend and forwards /api/*, and nothing else is exposed.
# Usage: docker compose up --build --detach --wait && bash scripts/smoke-test.sh
#
# Every response is captured before it is searched: a pipeline such as
# `curl | grep -q` can fail under pipefail when grep exits early.
set -euo pipefail

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

pass() {
  echo "ok: $1"
}

# --path-as-is sends dot segments untouched, as a hostile client would.
status_of() {
  curl -s --path-as-is -o /dev/null -w '%{http_code}' "$1"
}

contains() {
  grep -q -- "$2" <<<"$1"
}

services="webapp webapp-db api-service api-db"

# The course fixes the container names. They are read from compose.yaml alone,
# so a local compose.override.yaml for a parallel worktree cannot hide a change.
declared=$(docker compose -f compose.yaml config --format json | python3 -c '
import json, sys
for name, service in json.load(sys.stdin)["services"].items():
    print(name, service.get("container_name", ""))
')
for name in $services; do
  grep -qx -- "$name $name" <<<"$declared" || fail "compose.yaml does not name the $name container $name"
done
pass "compose.yaml declares the four documented container names"

running=$(docker compose ps --status running --format '{{.Service}}')
for name in $services; do
  grep -qx -- "$name" <<<"$running" || fail "service $name is not running"
done
pass "the four services run"

# Ask Compose where webapp is published, so WEBAPP_PORT in .env is honoured.
published=$(docker compose port webapp 8000) || fail "webapp publishes no port"
base="http://localhost:${published##*:}"

# Spaces are removed so checks do not depend on how a service formats JSON.
api_health=$(curl -fsS "$base/api/health" | tr -d '[:space:]')
contains "$api_health" '"service":"api-service"' || fail "/api/health was not answered by api-service: $api_health"
contains "$api_health" '"database":"ok"' || fail "api-service does not reach api-db: $api_health"
pass "/api/health on webapp returns the answer of api-service"

webapp_health=$(curl -fsS "$base/health" | tr -d '[:space:]')
contains "$webapp_health" '"service":"webapp"' || fail "/health was not answered by webapp: $webapp_health"
contains "$webapp_health" '"database":"ok"' || fail "webapp does not reach webapp-db: $webapp_health"
pass "/health reports webapp and webapp-db as ready"

for route in / /dashboard /accounts; do
  page=$(curl -fsS "$base$route")
  contains "$page" 'id="root"' || fail "$route did not serve the frontend"
done
pass "client-side routes open directly"

scripts=$(grep -o '/assets/[^"]*\.js' <<<"$page") || fail "the entry page names no script"
asset=${scripts%%$'\n'*}
[ "$(status_of "$base$asset")" = "200" ] || fail "$asset was not served"
pass "the built assets are served"

[ "$(status_of "$base/api/accounts")" = "401" ] || fail "/api/accounts without a session should answer 401"
pass "financial calls without a session answer 401"

for route in /auth/unknown /api/../health /assets/missing.js; do
  [ "$(status_of "$base$route")" = "404" ] || fail "$route should answer 404"
  page=$(curl -s --path-as-is "$base$route")
  if contains "$page" 'id="root"'; then
    fail "$route was answered with the frontend"
  fi
done
pass "backend routes and missing files are never answered with the frontend"

for name in api-service webapp-db api-db price-refresher; do
  ports=$(docker port "$(docker compose ps --quiet "$name")")
  [ -z "$ports" ] || fail "$name publishes a port: $ports"
done
pass "only webapp publishes a port"

status_without_credential=$(docker compose exec -T webapp python -c "
import urllib.error, urllib.request
try:
    urllib.request.urlopen('http://api-service:8000/api/accounts', timeout=5)
except urllib.error.HTTPError as error:
    print(error.code)
")
[ "$status_without_credential" = "403" ] || fail "api-service accepted a request without the service credential: $status_without_credential"
pass "api-service rejects a request without the service credential"

echo "All checks passed."
