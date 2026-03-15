#!/usr/bin/env bash
# Verify API, backend, and frontend.
# Usage:
#   Local stack (Docker on this machine):  bash deploy/app/verify.sh http://localhost
#   Production (after deploy on server):   bash deploy/app/verify.sh https://safepsy.com
set -e
BASE="${1:-https://safepsy.com}"
echo "Verifying $BASE ..."
FAIL=0
echo -n "  /healthz: "
H=$(curl -sS -o /tmp/healthz.out -w "%{http_code}" "$BASE/healthz" 2>/dev/null || echo "000")
if [ "$H" = "200" ] && grep -q "ok" /tmp/healthz.out 2>/dev/null; then echo "OK (200, body ok)"; else echo "FAIL (HTTP $H, expected 200 and body 'ok')"; [ -s /tmp/healthz.out ] && head -1 /tmp/healthz.out; FAIL=1; fi
echo -n "  / (frontend): "
R=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/" 2>/dev/null || echo "000")
if [ "$R" = "200" ]; then echo "OK (200)"; else echo "FAIL (HTTP $R)"; FAIL=1; fi
echo -n "  /api (backend): "
A=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/api/testing/health" 2>/dev/null || echo "000")
if [ "$A" = "200" ]; then echo "OK (200)"; else echo "HTTP $A (502 = backend down, check: docker compose -f deploy/app/docker-compose.app.yml logs app)"; FAIL=1; fi
echo "Done."
[ "$FAIL" = "1" ] && exit 1 || exit 0
