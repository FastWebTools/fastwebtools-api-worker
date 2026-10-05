#!/usr/bin/env bash
# Only endpoints verified not to write through their current handlers.
# GET likes and comments endpoints are deliberately excluded: they can perform writes/DDL.
set -euo pipefail
BASE="${1:?Usage: bash scripts/smoke.sh https://PUBLIC-API-BASE}"
BASE="${BASE%/}"
check() {
  local path="$1" kind="$2" body code
  body=$(mktemp)
  if ! code=$(curl --silent --show-error --max-time 15 --output "$body" --write-out '%{http_code}' "$BASE$path"); then
    rm -f "$body"; echo "FAIL $path: network request failed"; return 1
  fi
  if [ "$code" != '200' ]; then
    rm -f "$body"; echo "FAIL $path: HTTP $code"; return 1
  fi
  if ! python3 - "$body" "$kind" <<'PY_CHECK'
import json,sys
with open(sys.argv[1]) as f: d=json.load(f)
assert d.get('success') is True, 'success is not true'
if sys.argv[2]=='version':
    assert d.get('worker')=='fastwebtools-api', 'wrong worker'
    assert isinstance(d.get('version'),str) and d['version'], 'missing version'
else:
    assert isinstance(d.get('tools'),list), 'tools is not an array'
    for t in d['tools']:
        assert isinstance(t.get('id'),str), 'invalid tool ID'
        assert isinstance(t.get('count'),(int,float)) and not isinstance(t['count'],bool) and t['count']>=0, 'invalid count'
PY_CHECK
  then
    rm -f "$body"; echo "FAIL $path: invalid JSON or response shape"; return 1
  fi
  rm -f "$body"; echo "PASS $path"
}
check /version version
check /popular-tools tools
echo 'Basic read-only health checks passed. NOT a full functional-test result.'
