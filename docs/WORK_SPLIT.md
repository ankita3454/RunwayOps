# Work split, commit plan & study guide

Marks are **individual**, so each person commits their own files from their own GitHub account and must be able to explain them line by line.

## Who owns which file

| File | Ankita (Venue & Operations) | Ankitha (Designer & Finance) |
|---|---|---|
| `package.json`, `next.config.mjs`, `jsconfig.json`, `.gitignore`, `.env.example`, `README.md` | ✔ | |
| `scripts/setup-db.mjs` | ✔ | |
| `db/mysql/01_schema.sql` | USER_ACCOUNT, VENUE, RUNWAY_SEGMENT, STAFF, FACILITY, MODEL, USES | DESIGNER, COLLECTION, PAYMENT, RECEIPT, ALLOCATED_TO, WALKS_IN |
| `db/mysql/02_triggers.sql` | trg_no_slot_overlap(_upd), trg_supervisor_check(_upd) | trg_allocation_check, trg_auto_receipt(_upd) |
| `db/mysql/03_procedures.sql` | | ✔ (book_slot, cancel_booking, fn_designer_total_paid) |
| `db/mysql/04_views_indexes.sql` | ✔ (v_show_schedule, v_slot_utilisation, v_venue_revenue, indexes) | v_designer_payments, FULLTEXT index |
| `db/mysql/05_seed.sql` | venues, slots, staff, facilities, models, uses | designers, collections, bookings, walks_in |
| `db/mysql/06_alter_drop_demo.sql` | ✔ | |
| `db/mysql/07_queries.sql` | Q1–Q4, Q9 | Q5–Q8 |
| `db/redis/README.md` | sessions section | holds + trending sections |
| `lib/db.js`, `lib/auth.js`, `lib/queries.js` | ✔ | |
| `lib/redis.js` | sessions part | holds + trending part |
| `app/layout.js`, `app/page.js`, `app/globals.css`, `app/login`, `components/*` | ✔ | |
| `app/api/auth/*`, `venues`, `slots`, `staff`, `facilities`, `uses` | ✔ | |
| `app/api/collections`, `booking/*`, `walks` | | ✔ |
| `app/admin/**`, `app/staff`, `app/model` | ✔ | |
| `app/designer/**`, `app/collections/**` | | ✔ |
| `tests/sql_tests.sh` | T1–T9 | T10–T16 |
| Report sections | ER, schema, data dictionary (own tables), architecture | DB choice justification, Redis model, queries, testing |

Shared files (01, 02, 04, 05, 07, lib/redis.js): Ankita commits her part first, then Ankitha adds hers in a separate commit on her branch.

## Commit plan (so the history shows both of you)

```bash
# --- Ankita (repo owner) ---
git init && git checkout -b main
git add .gitignore .env.example package.json package-lock.json next.config.mjs jsconfig.json README.md
git commit -m "Project setup"
git remote add origin https://github.com/<you>/runwayops.git && git push -u origin main
# add Ankitha: GitHub → Settings → Collaborators

git checkout -b venue-ops
# add your files / your parts of shared files, in several small commits, e.g.
git add db/mysql/01_schema.sql   && git commit -m "Schema: venue, weak runway segment, recursive staff"
git add db/mysql/02_triggers.sql && git commit -m "Triggers: slot overlap, supervisor rules"
git add lib app/api/auth app/login components && git commit -m "Auth with Redis sessions and role checks"
git add app/admin app/staff app/model app/api/{venues,slots,staff,facilities,uses} && git commit -m "Admin, staff and model pages"
git push -u origin venue-ops     # open a PR → merge into main

# --- Ankitha ---
git clone https://github.com/<ankita>/runwayops.git && cd runwayops
git checkout -b designer-finance
# add her parts: procedures, her triggers, booking API, designer + collections pages, Redis holds/trending
git commit ...   # several small commits from HER account
git push -u origin designer-finance   # PR → merge
```

Spread commits over the days you actually work. Twenty commits in the last hour looks bad.

## Study guide for Ankitha (read in this order, ~2 hours)

1. `db/mysql/01_schema.sql`: your five tables. Know why `RECEIPT.Payment_ID` is `UNIQUE NOT NULL` (1:1) and why `ALLOCATED_TO` has `UNIQUE (Venue_ID, Slot_No)` (one collection per slot).
2. `db/mysql/02_triggers.sql`: `trg_allocation_check` and `trg_auto_receipt`. Know BEFORE vs AFTER, and why a CHECK can't do this (a CHECK can't read other rows or tables).
3. `db/mysql/03_procedures.sql`: `book_slot`. Trace `START TRANSACTION`, `SELECT … FOR UPDATE`, two INSERTs, `COMMIT`, and the `EXIT HANDLER` that runs `ROLLBACK` + `RESIGNAL`.
4. `lib/redis.js` + `db/redis/README.md`: `SET NX EX`, `ZINCRBY`, `ZREVRANGE`. Learn the "why Redis" answer.
5. `app/api/booking/hold/route.js` → `confirm/route.js`: how Redis and MySQL work together.
6. `app/designer/book/page.js`, `app/collections/page.js`: the UI and the `MATCH … AGAINST` full-text query.
7. Run `npm run test:db` and break things on purpose in the UI (overlapping slot, wrong show time, a second designer holding the same slot).

### Likely viva questions
- What happens if two designers click "Pay & book" on the same slot at the same moment? *(Redis NX means only one can hold it. Even if Redis failed, `FOR UPDATE` plus the UNIQUE constraint stop the second booking.)*
- Why is `RUNWAY_SEGMENT` a weak entity, and what is its key? *(Slot number only makes sense within a venue; the key is (Venue_ID, Slot_No); ON DELETE CASCADE.)*
- Show the recursive relationship in the schema. *(`STAFF.Supervisor_ID → STAFF.Staff_ID`; queried with `WITH RECURSIVE`.)*
- What is the difference between a trigger and a stored procedure?
- Why aren't sessions stored in MySQL?
- What does `RESIGNAL` do in `book_slot`?
