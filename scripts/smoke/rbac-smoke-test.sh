#!/usr/bin/env bash
set -euo pipefail

# ==========================================================
# RBAC Smoke Test
# ==========================================================
# Tests the 5 org-membership-gated read endpoints:
#   GET /api/teams/:teamId/events
#   GET /api/teams/:teamId/matches
#   GET /api/events?organizationId=...
#   GET /api/matches?organizationId=...
#   GET /api/players/:playerId/mmr
#
# Requires two users:
#   UserA — NOT a member of UserB's organisation
#   UserB — IS a member of their own organisation (with team + player)
#
# Usage:
#   ./rbac-smoke-test.sh            # run against existing data
#   ./rbac-smoke-test.sh --setup    # register users + create org/team/player
# ==========================================================

# ==========================================================
# Config (override via env vars)
# ==========================================================
BASE_URL="${BASE_URL:-http://localhost:3000}"

A_EMAIL="${A_EMAIL:-usera@example.com}"
A_PASS="${A_PASS:-Password123!}"

B_EMAIL="${B_EMAIL:-userb@example.com}"
B_PASS="${B_PASS:-Password123!}"

ORG_B_ID="${ORG_B_ID:-}"
TEAM_B_ID="${TEAM_B_ID:-}"
PLAYER_B_ID="${PLAYER_B_ID:-}"

ALLOW_MMR_404="${ALLOW_MMR_404:-true}"

SETUP_MODE=false
if [[ "${1:-}" == "--setup" ]]; then
  SETUP_MODE=true
fi

LOG_DIR="${LOG_DIR:-logs}"

# ==========================================================
# Logging & counters
# ==========================================================
ts() { date +"%Y%m%d-%H%M%S"; }
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/smoke-$(ts).log"

PASS_COUNT=0
FAIL_COUNT=0

log()  { echo -e "\n==> $*" >> "$LOG_FILE"; echo -e "\n==> $*" >&2; }
info() { echo -e "    $*" >> "$LOG_FILE"; echo -e "    $*" >&2; }
pass() { PASS_COUNT=$((PASS_COUNT + 1)); echo -e "✅ PASS  $*" >> "$LOG_FILE"; echo -e "✅ PASS  $*" >&2; }
fail_msg() { FAIL_COUNT=$((FAIL_COUNT + 1)); echo -e "❌ FAIL  $*" >> "$LOG_FILE"; echo -e "❌ FAIL  $*" >&2; }
abort() { echo -e "💀 ABORT $*" >> "$LOG_FILE"; echo -e "💀 ABORT $*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || abort "Missing dependency: $1"
}

# ==========================================================
# Temp file management
# ==========================================================
TMPFILES=()
make_tmp() {
  local f; f="$(mktemp)"
  TMPFILES+=("$f")
  echo "$f"
}
cleanup() {
  rm -f "${TMPFILES[@]}" cookies-a.txt cookies-b.txt 2>/dev/null || true
}
trap cleanup EXIT

# ==========================================================
# HTTP helpers
# ==========================================================
LAST_HDR=""
LAST_BODY=""
LAST_CODE=""

do_request() {
  local method="$1"; shift
  local url="$1"; shift

  LAST_HDR="$(make_tmp)"
  LAST_BODY="$(make_tmp)"
  LAST_CODE="$(curl -sS -X "$method" -D "$LAST_HDR" -o "$LAST_BODY" "$@" "$url" -w "%{http_code}")"
}

extract_request_id() {
  grep -i '^x-request-id:' "$LAST_HDR" 2>/dev/null | head -n 1 | awk -F': ' '{print $2}' | tr -d '\r'
}

print_debug() {
  local method="$1" url="$2" expected="$3"
  fail_msg "Expected HTTP $expected but got $LAST_CODE  —  $method $url"
  local rid; rid="$(extract_request_id)"
  [[ -n "$rid" ]] && info "x-request-id: $rid"
  info "--- Response headers (first 30 lines) ---"
  head -n 30 "$LAST_HDR" | sed 's/\r$//' >> "$LOG_FILE"
  info "--- Response body (first 60 lines) ---"
  head -n 60 "$LAST_BODY" | sed 's/^/    /' | tee -a "$LOG_FILE" >&2
  info "--- Full debug saved in: $LOG_FILE ---"
}

# ==========================================================
# Auth helpers
# ==========================================================
A_TOKEN=""
B_TOKEN=""

register_user() {
  local email="$1" pass="$2" name="$3" cookie_file="$4"
  log "Registering $email"
  do_request "POST" "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -c "$cookie_file" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\",\"displayName\":\"$name\"}"

  if [[ "$LAST_CODE" == "200" ]]; then
    info "Registered $email successfully"
    return 0
  fi

  local err_code
  err_code="$(jq -r '.error // empty' "$LAST_BODY" 2>/dev/null)"
  if [[ "$LAST_CODE" == "409" || "$err_code" == "email_already_in_use" ]]; then
    info "Already registered ($err_code) — will login instead"
    return 1
  fi

  abort "Register failed for $email (HTTP $LAST_CODE, error=$err_code): $(head -n 10 "$LAST_BODY")"
}

login_user() {
  local email="$1" pass="$2" cookie_file="$3"
  log "Login for $email"
  do_request "POST" "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -c "$cookie_file" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}"

  if [[ "$LAST_CODE" != "200" ]]; then
    print_debug "POST" "$BASE_URL/api/auth/login" "200"
    abort "Login failed for $email"
  fi
  pass "Login OK for $email"
}

ensure_user() {
  local email="$1" pass="$2" name="$3" cookie_file="$4"
  if [[ "$SETUP_MODE" == "true" ]]; then
    register_user "$email" "$pass" "$name" "$cookie_file" || true
  fi
  login_user "$email" "$pass" "$cookie_file"
}

refresh_token() {
  local cookie_file="$1"
  do_request "POST" "$BASE_URL/api/auth/refresh" -b "$cookie_file" -c "$cookie_file"

  if [[ "$LAST_CODE" != "200" ]]; then
    print_debug "POST" "$BASE_URL/api/auth/refresh" "200"
    abort "Refresh failed (cookie file: $cookie_file)"
  fi

  local token
  token="$(jq -r '.accessToken // empty' "$LAST_BODY" 2>/dev/null)"
  if [[ -z "$token" ]]; then
    abort "Refresh response missing accessToken: $(cat "$LAST_BODY")"
  fi
  echo "$token"
}

refresh_both() {
  log "Refreshing access tokens"
  A_TOKEN="$(refresh_token cookies-a.txt)"
  pass "A_TOKEN refreshed (len=${#A_TOKEN})"
  B_TOKEN="$(refresh_token cookies-b.txt)"
  pass "B_TOKEN refreshed (len=${#B_TOKEN})"
}

# ==========================================================
# Assertion helpers
# ==========================================================
assert_code() {
  local expected="$1"; shift
  local method="$1"; shift
  local url="$1"; shift

  do_request "$method" "$url" "$@"

  if [[ "$LAST_CODE" == "401" && "$expected" != "401" ]]; then
    info "Got 401 — refreshing tokens and retrying once"
    refresh_both
    do_request "$method" "$url" "$@"
  fi

  if [[ "$LAST_CODE" != "$expected" ]]; then
    print_debug "$method" "$url" "$expected"
    return 1
  fi

  pass "HTTP $LAST_CODE  $method $url"
  return 0
}

assert_code_one_of() {
  local exp1="$1"; shift
  local exp2="$1"; shift
  local method="$1"; shift
  local url="$1"; shift

  do_request "$method" "$url" "$@"

  if [[ "$LAST_CODE" == "401" && "$exp1" != "401" && "$exp2" != "401" ]]; then
    info "Got 401 — refreshing tokens and retrying once"
    refresh_both
    do_request "$method" "$url" "$@"
  fi

  if [[ "$LAST_CODE" != "$exp1" && "$LAST_CODE" != "$exp2" ]]; then
    print_debug "$method" "$url" "$exp1/$exp2"
    return 1
  fi

  pass "HTTP $LAST_CODE  $method $url"
  return 0
}

# ==========================================================
# Data discovery helpers
# ==========================================================
pick_first_org_for_user_b() {
  log "Discover org for UserB (GET /api/me/organizations)"
  do_request "GET" "$BASE_URL/api/me/organizations" -H "Authorization: Bearer $B_TOKEN"
  if [[ "$LAST_CODE" != "200" ]]; then
    print_debug "GET" "$BASE_URL/api/me/organizations" "200"
    abort "Cannot list orgs for UserB"
  fi

  local oid
  oid="$(jq -r '.organizations[0].organizationId // empty' "$LAST_BODY")"
  if [[ -z "$oid" ]]; then
    abort "UserB has no organizations. Re-run with --setup to create one."
  fi
  pass "Picked ORG_B_ID=$oid"
  echo "$oid"
}

pick_first_team_for_org() {
  local org_id="$1"
  log "Discover team (GET /api/teams?organizationId=$org_id)"
  do_request "GET" "$BASE_URL/api/teams?organizationId=$org_id" -H "Authorization: Bearer $B_TOKEN"
  if [[ "$LAST_CODE" != "200" ]]; then
    print_debug "GET" "$BASE_URL/api/teams?organizationId=$org_id" "200"
    abort "Cannot list teams for org"
  fi

  local tid
  tid="$(jq -r '.[0].id // empty' "$LAST_BODY")"
  if [[ -z "$tid" ]]; then
    abort "No teams in org $org_id. Re-run with --setup to create one."
  fi
  pass "Picked TEAM_B_ID=$tid"
  echo "$tid"
}

pick_first_player_for_org() {
  local org_id="$1"
  log "Discover player (GET /api/players?organizationId=$org_id)"
  do_request "GET" "$BASE_URL/api/players?organizationId=$org_id" -H "Authorization: Bearer $B_TOKEN"
  if [[ "$LAST_CODE" != "200" ]]; then
    print_debug "GET" "$BASE_URL/api/players?organizationId=$org_id" "200"
    abort "Cannot list players for org"
  fi

  local pid
  pid="$(jq -r '.[0].id // empty' "$LAST_BODY")"
  if [[ -z "$pid" ]]; then
    abort "No players in org $org_id. Re-run with --setup to create one."
  fi
  pass "Picked PLAYER_B_ID=$pid"
  echo "$pid"
}

# ==========================================================
# Setup: create org, team, player for UserB
# ==========================================================
setup_ensure_org() {
  if [[ -n "$ORG_B_ID" ]]; then return 0; fi
  log "SETUP: Creating org for UserB"
  local slug="smoke-test-org-$(date +%s)"
  do_request "POST" "$BASE_URL/api/organizations" \
    -H "Authorization: Bearer $B_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Smoke Test Org\",\"slug\":\"$slug\"}"
  if [[ "$LAST_CODE" == "201" ]]; then
    ORG_B_ID="$(jq -r '.id // empty' "$LAST_BODY")"
    if [[ -z "$ORG_B_ID" ]]; then
      abort "Org created (201) but response missing .id: $(head -n 10 "$LAST_BODY")"
    fi
    pass "Created org $ORG_B_ID"
  else
    info "Org creation returned HTTP $LAST_CODE — will discover existing"
  fi
}

setup_ensure_team() {
  if [[ -n "$TEAM_B_ID" ]]; then return 0; fi
  log "SETUP: Creating team in org $ORG_B_ID"
  local game_id
  do_request "GET" "$BASE_URL/api/games" -H "Authorization: Bearer $B_TOKEN"
  game_id="$(jq -r '.[0].id // empty' "$LAST_BODY")"
  if [[ -z "$game_id" ]]; then
    abort "No games in database — cannot create team"
  fi
  do_request "POST" "$BASE_URL/api/teams" \
    -H "Authorization: Bearer $B_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"organizationId\":\"$ORG_B_ID\",\"gameId\":\"$game_id\",\"name\":\"Smoke Team\"}"
  if [[ "$LAST_CODE" == "201" ]]; then
    TEAM_B_ID="$(jq -r '.id // empty' "$LAST_BODY")"
    pass "Created team $TEAM_B_ID"
  else
    info "Team creation returned HTTP $LAST_CODE — will discover existing"
  fi
}

setup_ensure_player() {
  if [[ -n "$PLAYER_B_ID" ]]; then return 0; fi
  log "SETUP: Creating player in org $ORG_B_ID"
  do_request "POST" "$BASE_URL/api/players" \
    -H "Authorization: Bearer $B_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"organizationId\":\"$ORG_B_ID\",\"nickname\":\"SmokePlayer\"}"
  if [[ "$LAST_CODE" == "201" ]]; then
    PLAYER_B_ID="$(jq -r '.id // empty' "$LAST_BODY")"
    pass "Created player $PLAYER_B_ID"
  else
    info "Player creation returned HTTP $LAST_CODE — will discover existing"
  fi
}

# ==========================================================
# Main
# ==========================================================
need_cmd curl
need_cmd jq

log "RBAC Smoke Test starting"
info "BASE_URL=$BASE_URL"
info "LOG_FILE=$LOG_FILE"
info "SETUP_MODE=$SETUP_MODE"

ensure_user "$A_EMAIL" "$A_PASS" "UserA" "cookies-a.txt"
ensure_user "$B_EMAIL" "$B_PASS" "UserB" "cookies-b.txt"

# ----------------------------------------------------------
# Block 0: Baseline checks (health, refresh, sessions)
# ----------------------------------------------------------
log "BLOCK 0 — Baseline (health, refresh, sessions)"

assert_code 200 "GET" "$BASE_URL/api/core/health" || true

do_request "POST" "$BASE_URL/api/auth/refresh" -b "cookies-b.txt" -c "cookies-b.txt"
if [[ "$LAST_CODE" == "200" ]]; then
  B_TOKEN="$(jq -r '.accessToken // empty' "$LAST_BODY" 2>/dev/null)"
  pass "HTTP 200  POST $BASE_URL/api/auth/refresh (UserB)"
else
  print_debug "POST" "$BASE_URL/api/auth/refresh" "200"
fi

do_request "POST" "$BASE_URL/api/auth/refresh" -b "cookies-a.txt" -c "cookies-a.txt"
if [[ "$LAST_CODE" == "200" ]]; then
  A_TOKEN="$(jq -r '.accessToken // empty' "$LAST_BODY" 2>/dev/null)"
  pass "HTTP 200  POST $BASE_URL/api/auth/refresh (UserA)"
else
  print_debug "POST" "$BASE_URL/api/auth/refresh" "200"
fi

assert_code 200 "GET" "$BASE_URL/api/me/sessions" -H "Authorization: Bearer $B_TOKEN" || true

if [[ "$SETUP_MODE" == "true" ]]; then
  setup_ensure_org
fi

if [[ -z "$ORG_B_ID" ]];  then ORG_B_ID="$(pick_first_org_for_user_b)"; fi
info "ORG_B_ID=$ORG_B_ID"

if [[ "$SETUP_MODE" == "true" ]]; then
  setup_ensure_team
  setup_ensure_player
fi

if [[ -z "$TEAM_B_ID" ]];   then TEAM_B_ID="$(pick_first_team_for_org "$ORG_B_ID")"; fi
info "TEAM_B_ID=$TEAM_B_ID"

if [[ -z "$PLAYER_B_ID" ]]; then PLAYER_B_ID="$(pick_first_player_for_org "$ORG_B_ID")"; fi
info "PLAYER_B_ID=$PLAYER_B_ID"

refresh_both

# ----------------------------------------------------------
# Block 1: Non-member (UserA) must get 403
# ----------------------------------------------------------
log "BLOCK 1 — Non-member (UserA) must get 403"

assert_code 403 "GET" "$BASE_URL/api/teams/$TEAM_B_ID/events"          -H "Authorization: Bearer $A_TOKEN" || true
assert_code 403 "GET" "$BASE_URL/api/teams/$TEAM_B_ID/matches"         -H "Authorization: Bearer $A_TOKEN" || true
assert_code 403 "GET" "$BASE_URL/api/events?organizationId=$ORG_B_ID"  -H "Authorization: Bearer $A_TOKEN" || true
assert_code 403 "GET" "$BASE_URL/api/matches?organizationId=$ORG_B_ID" -H "Authorization: Bearer $A_TOKEN" || true
assert_code 403 "GET" "$BASE_URL/api/players/$PLAYER_B_ID/mmr"         -H "Authorization: Bearer $A_TOKEN" || true

refresh_both

# ----------------------------------------------------------
# Block 2: Member (UserB) must get 200 (MMR may be 404)
# ----------------------------------------------------------
log "BLOCK 2 — Member (UserB) must get 200"

assert_code 200 "GET" "$BASE_URL/api/teams/$TEAM_B_ID/events"          -H "Authorization: Bearer $B_TOKEN" || true
assert_code 200 "GET" "$BASE_URL/api/teams/$TEAM_B_ID/matches"         -H "Authorization: Bearer $B_TOKEN" || true
assert_code 200 "GET" "$BASE_URL/api/events?organizationId=$ORG_B_ID"  -H "Authorization: Bearer $B_TOKEN" || true
assert_code 200 "GET" "$BASE_URL/api/matches?organizationId=$ORG_B_ID" -H "Authorization: Bearer $B_TOKEN" || true

if [[ "$ALLOW_MMR_404" == "true" ]]; then
  assert_code_one_of 200 404 "GET" "$BASE_URL/api/players/$PLAYER_B_ID/mmr" -H "Authorization: Bearer $B_TOKEN" || true
else
  assert_code 200 "GET" "$BASE_URL/api/players/$PLAYER_B_ID/mmr" -H "Authorization: Bearer $B_TOKEN" || true
fi

# ----------------------------------------------------------
# Summary
# ----------------------------------------------------------
echo "" | tee -a "$LOG_FILE"
log "SUMMARY: $PASS_COUNT passed, $FAIL_COUNT failed"
info "Full log: $LOG_FILE"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  fail_msg "Some checks failed — see log above"
  exit 1
fi

pass "All smoke checks passed"
exit 0
