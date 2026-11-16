#!/usr/bin/env bash
# Checks a running Compose stack against the container skeleton contract:
# webapp serves the frontend and forwards /api/*, and nothing else is exposed.
# Usage: docker compose up --build --detach --wait && bash scripts/smoke-test.sh
set -euo pipefail

base="http://localhost:${WEBAPP_PORT:-8000}"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

pass() {
  echo "ok: $1"
}

status_of() {
  curl -s -o /dev/null -w '%{http_code}' "$1"
}

# Fetch JSON without spaces, so checks do not depend on how a service formats it.
compact_json() {
  curl -fsS "$1" | tr -d '[:space:]'
}

for name in webapp webapp-db api-service api-db; do
  docker ps --format '{{.Names}}' | grep -qx "$name" || fail "container $name is not running"
done
pass "the four containers run with their documented names"

api_health=$(compact_json "$base/api/health")
echo "$api_health" | grep -q '"service":"api-service"' || fail "/api/health was not answered by api-service: $api_health"
echo "$api_health" | grep -q '"database":"ok"' || fail "api-service does not reach api-db: $api_health"
pass "/api/health on webapp returns the answer of api-service"

webapp_health=$(compact_json "$base/health")
echo "$webapp_health" | grep -q '"service":"webapp"' || fail "/health was not answered by webapp: $webapp_health"
echo "$webapp_health" | grep -q '"database":"ok"' || fail "webapp does not reach webapp-db: $webapp_health"
pass "/health reports webapp and webapp-db as ready"

for route in / /dashboard /accounts; do
  curl -fsS "$base$route" | grep -q 'id="root"' || fail "$route did not serve the frontend"
done
pass "client-side routes open directly"

asset=$(curl -fsS "$base/dashboard" | grep -o '/assets/[^"]*\.js' | head -n 1)
[ -n "$asset" ] || fail "the entry page names no script"
[ "$(status_of "$base$asset")" = "200" ] || fail "$asset was not served"
pass "the built assets are served"

for route in /auth/unknown /api/unknown /assets/missing.js; do
  [ "$(status_of "$base$route")" = "404" ] || fail "$route should answer 404"
  if curl -s "$base$route" | grep -q 'id="root"'; then
    fail "$route was answered with the frontend"
  fi
done
pass "backend routes and missing files are never answered with the frontend"

[ -n "$(docker port webapp)" ] || fail "webapp publishes no port"
for name in api-service webapp-db api-db; do
  [ -z "$(docker port "$name")" ] || fail "$name publishes a port: $(docker port "$name")"
done
pass "only webapp publishes a port"

direct=$(docker compose exec -T webapp python -c "
import urllib.error, urllib.request
try:
    urllib.request.urlopen('http://api-service:8000/api/accounts', timeout=5)
except urllib.error.HTTPError as error:
    print(error.code)
")
[ "$direct" = "403" ] || fail "api-service accepted a request without the service credential: $direct"
pass "api-service rejects a request without the service credential"

echo "All checks passed."
