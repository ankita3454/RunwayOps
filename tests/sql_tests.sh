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
expect_error "T1  negative payment amount rejected" \
  "INSERT INTO PAYMENT (Amount,Payment_Mode,Designer_ID,Venue_ID,Slot_No) VALUES (-5,'UPI',1,1,2)" \
  "chk_payment_amount"
expect_error "T2  slot ending before it starts rejected" \
  "INSERT INTO RUNWAY_SEGMENT VALUES (3,9,'MAIN','2026-12-01','15:00','14:00',1000)" \
  "chk_segment_time"
expect_error "T3  invalid payment mode rejected" \
  "INSERT INTO PAYMENT (Amount,Payment_Mode,Designer_ID,Venue_ID,Slot_No) VALUES (5,'CASH',1,1,2)" \
  "chk_payment_mode"
expect_error "T4  bad phone number rejected" \
  "INSERT INTO MODEL (Model_Name,Agency,Contact) VALUES ('X','Y','12ab')" \
  "chk_model_contact"
expect_error "T5  payment for a slot that does not exist rejected (FK)" \
  "INSERT INTO PAYMENT (Amount,Payment_Mode,Designer_ID,Venue_ID,Slot_No) VALUES (5,'UPI',1,1,99)" \
  "foreign key constraint fails"
expect_error "T6  second collection on an already booked slot rejected (UNIQUE)" \
  "INSERT INTO ALLOCATED_TO (Collection_ID,Venue_ID,Slot_No,Rehearsal_Time,Show_Time) VALUES (2,1,4,'2026-11-20 16:00','2026-11-20 18:10')" \
  "Duplicate entry"

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
expect_error "T10 allocation without a successful payment rejected" \
  "INSERT INTO ALLOCATED_TO (Collection_ID,Venue_ID,Slot_No,Rehearsal_Time,Show_Time) VALUES (2,1,2,'2026-11-20 09:00','2026-11-20 11:30')" \
  "No successful payment"
expect_value "T11 receipt auto-generated for a successful payment" \
  "START TRANSACTION; INSERT INTO PAYMENT (Amount,Payment_Mode,Designer_ID,Venue_ID,Slot_No) VALUES (10,'UPI',3,1,3); SELECT COUNT(*) FROM RECEIPT WHERE Payment_ID = LAST_INSERT_ID(); ROLLBACK;" \
  "1"
expect_value "T12 no receipt for a FAILED payment" \
  "START TRANSACTION; INSERT INTO PAYMENT (Amount,Payment_Mode,Status,Designer_ID,Venue_ID,Slot_No) VALUES (10,'UPI','FAILED',3,1,3); SELECT COUNT(*) FROM RECEIPT WHERE Payment_ID = LAST_INSERT_ID(); ROLLBACK;" \
  "0"

echo "--- stored procedure + transaction ---"
expect_error "T13 booking someone else's collection rejected" \
  "CALL book_slot(1, 3, 1, 2, 'UPI', '2026-11-20 09:00', '2026-11-20 11:30', @p, @r)" \
  "does not belong"
expect_error "T14 booking an already allocated slot rejected" \
  "CALL book_slot(1, 2, 1, 4, 'UPI', '2026-11-20 16:00', '2026-11-20 18:00', @p, @r)" \
  "already allocated"
expect_error "T15 show time outside slot window rejected" \
  "CALL book_slot(1, 2, 1, 2, 'UPI', '2026-11-20 09:00', '2026-11-20 17:00', @p, @r)" \
  "inside the booked slot window"
expect_value "T16 failed booking rolled back completely (no payment left behind)" \
  "SELECT COUNT(*) FROM PAYMENT WHERE Designer_ID = 1 AND Venue_ID = 1 AND Slot_No = 2" \
  "0"

echo
echo "Result: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
