# RunwayOps: Fashion Week Slot Booking & Backstage Management

DBMS Level 3 project · PES University · Ankita Pramod & Ankitha

Designers book runway slots through a guarded, transactional flow, and the **database itself** enforces the rules: no overlapping slots, no allocation without payment, receipts generated automatically, and a valid backstage hierarchy. Venues, facilities, staff and models are managed alongside.

**Stack:** Next.js 15 (App Router + Route Handlers) · MySQL 8.0.16+ · Redis

---

## Setup (do this on BOTH laptops)

### 1. Install
- Node.js 20+
- MySQL **8.0.16 or newer** (older versions silently ignore CHECK constraints). On Mac: `brew install mysql && brew services start mysql`
- Redis: either `brew install redis && brew services start redis`, or a free Redis Cloud / Upstash database (then both of you share one `REDIS_URL`)

### 2. Configure
```bash
cp .env.example .env.local
# edit .env.local: your MySQL user/password and REDIS_URL
npm install
```

### 3. Create the database (schema, triggers, procedures, views, seed data)
```bash
npm run db:setup
```
This runs `db/mysql/01 → 05` in order. It can be re-run any time to reset the data.
(The `mysql` CLI works too: `mysql -u root -p < db/mysql/01_schema.sql`, and so on.)

### 4. Run
```bash
npm run dev        # http://localhost:3000
```

### 5. Run the database test cases
```bash
MYSQL_USER=root MYSQL_PWD=yourpassword npm run test:db      # 16 tests, all should PASS
```

### Demo logins
| Role | Email | Password |
|---|---|---|
| Admin / Show Director | admin@runwayops.in | admin123 |
| Designer (has an unbooked collection) | aarav@noir.in | password123 |
| Designer | meera@kesari.in, rohan@loom.in, isha@verdant.in | password123 |
| Staff (head director) | kavya.staff@runwayops.in | password123 |
| Staff (coordinator) | dev.staff@runwayops.in | password123 |
| Model | tara@elitemodels.in, nikhil@inega.in | password123 |

---

## Project structure

```
db/mysql/01_schema.sql         13 tables, PK/FK, CHECK, UNIQUE, NOT NULL, ALTER for the self-FK
db/mysql/02_triggers.sql       7 triggers (overlap, supervisor rules, allocation check, auto receipt)
db/mysql/03_procedures.sql     book_slot(), cancel_booking() with transactions; fn_designer_total_paid()
db/mysql/04_views_indexes.sql  4 views, 2 indexes, 1 FULLTEXT index
db/mysql/05_seed.sql           demo data (bookings created by CALL book_slot)
db/mysql/06_alter_drop_demo.sql  ALTER / DROP to run live in the demo
db/mysql/07_queries.sql        the "important queries" (CTE, JOINs, HAVING, subqueries, full-text)
db/redis/README.md             Redis data model + justification + demo commands
lib/db.js, lib/redis.js, lib/auth.js, lib/queries.js
app/api/**                     backend API (Route Handlers), role-checked
app/admin, app/staff, app/model, app/designer, app/collections   UI pages
tests/sql_tests.sh             16 database test cases
docs/WORK_SPLIT.md             who owns what + commit plan + study guide
```

## Where each PDF requirement lives

| Requirement | Where |
|---|---|
| SQL + NoSQL | MySQL (`db/mysql`) + Redis (`lib/redis.js`, `db/redis/README.md`) |
| ER → relational schema | `01_schema.sql`: weak entity `RUNWAY_SEGMENT`, recursive `STAFF.Supervisor_ID`, M:N `USES` / `WALKS_IN`, 1:1 `RECEIPT` |
| CREATE / ALTER / DROP | `01_schema.sql` (ALTER adds self-FK), `06_alter_drop_demo.sql` |
| Constraints, DB-level validation | CHECK on amounts, times, enums, phone format, season format; UNIQUE; FKs with CASCADE / SET NULL |
| INSERT / UPDATE / DELETE / SELECT | every form in the app; `cancel_booking` does UPDATE + DELETE |
| JOIN, GROUP BY, HAVING, ORDER BY, aggregates, subqueries | `07_queries.sql`; used in the admin dashboard, designer and booking pages |
| Advanced SQL (≥ 4) | triggers ×7, stored procedures ×2 + function, transactions, views ×4, indexes, full-text search, recursive CTE |
| Advanced NoSQL (≥ 1) | Redis TTL holds (`SET NX EX`), sessions with TTL, sorted-set ranking |
| Next.js + API layer | `app/` pages + `app/api/**` route handlers |
| No hard-coded credentials | `.env.local` (gitignored); `.env.example` committed |
| Auth + ≥ 2 roles | bcrypt passwords in `USER_ACCOUNT`; sessions in Redis; 4 roles checked by `requireRole` / `apiAuth` |

## The core flow to demo: booking a slot

1. Designer → **Book a slot** → **Hold slot**. The API runs `SET hold:1:2 <designer> NX EX 600`. A second designer now sees "being booked".
2. **Pay & book** → `CALL book_slot(...)`:
   - `START TRANSACTION`, then lock the slot row (`FOR UPDATE`)
   - `INSERT PAYMENT` → trigger `trg_auto_receipt` inserts the `RECEIPT`
   - `INSERT ALLOCATED_TO` → trigger `trg_allocation_check` verifies the payment and show time
   - `COMMIT`. Any error → `ROLLBACK` (try a show time outside the slot: nothing is saved)
3. The hold is released. The admin dashboard views update immediately.
4. **Cancel booking** → `cancel_booking()`: payment becomes `REFUNDED`, allocation deleted, one transaction.
