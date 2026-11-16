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

running=$(docker ps --format '{{.Names}}')
for name in webapp webapp-db api-service api-db; do
  grep -qx -- "$name" <<<"$running" || fail "container $name is not running"
done
pass "the four containers run with their documented names"

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

for route in /auth/unknown /api/unknown /api/../health /assets/missing.js; do
  [ "$(status_of "$base$route")" = "404" ] || fail "$route should answer 404"
  page=$(curl -s --path-as-is "$base$route")
  if contains "$page" 'id="root"'; then
    fail "$route was answered with the frontend"
  fi
done
pass "backend routes and missing files are never answered with the frontend"

for name in api-service webapp-db api-db; do
  ports=$(docker port "$name")
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
