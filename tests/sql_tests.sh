#!/usr/bin/env bash
# =====================================================================
# Database-level test cases. Each test states what MUST happen.
# Usage:  MYSQL_PWD=yourpassword bash tests/sql_tests.sh
#         (optional: MYSQL_USER, MYSQL_HOST; database must be seeded)
# =====================================================================
USER="${MYSQL_USER:-root}"
HOST="${MYSQL_HOST:-127.0.0.1}"
run() { mysql -h"$HOST" -u"$USER" runwayops -N -e "$1" 2>&1; }

PASS=0; FAIL=0
expect_error() {   # name, sql, expected message fragment
  out=$(run "$2")
  if echo "$out" | grep -qi "$3"; then echo "PASS  $1"; PASS=$((PASS+1))
  else echo "FAIL  $1"; echo "      got: $out"; FAIL=$((FAIL+1)); fi
}
expect_value() {   # name, sql, expected output
  out=$(run "$2" | tail -1)
  if [ "$out" = "$3" ]; then echo "PASS  $1"; PASS=$((PASS+1))
  else echo "FAIL  $1 (expected '$3', got '$out')"; FAIL=$((FAIL+1)); fi
}

echo "--- constraints (CHECK / UNIQUE / FK) ---"
expect_error "T2  slot ending before it starts rejected" \
  "INSERT INTO RUNWAY_SEGMENT VALUES (3,9,'MAIN','2026-12-01','15:00','14:00',1000)" \
  "chk_segment_time"
expect_error "T4  bad phone number rejected" \
  "INSERT INTO MODEL (Model_Name,Agency,Contact) VALUES ('X','Y','12ab')" \
  "chk_model_contact"

echo "--- triggers ---"
expect_error "T7  overlapping slot at the same venue rejected" \
  "INSERT INTO RUNWAY_SEGMENT VALUES (1,9,'MAIN','2026-11-20','10:30','11:15',5000)" \
  "overlaps"
expect_error "T8  assistant stylist as supervisor rejected" \
  "INSERT INTO STAFF (Staff_Name,Staff_Role,Contact,Supervisor_ID) VALUES ('New','ASSISTANT_STYLIST','9811111111',5)" \
  "cannot supervise"
expect_error "T9  non-director without supervisor rejected" \
  "INSERT INTO STAFF (Staff_Name,Staff_Role,Contact) VALUES ('New','ASSISTANT_STYLIST','9811111111')" \
  "Only a SHOW_DIRECTOR"


echo
echo "Result: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
