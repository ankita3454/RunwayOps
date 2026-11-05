# Redis data model (NoSQL component)

Redis owns data that is **temporary, fast-changing or ranked**. MySQL stays the source of truth for anything permanent.

| Key pattern | Type | TTL | Written by | Purpose | Owner |
|---|---|---|---|---|---|
| `session:{token}` | Hash `{userId, role, email, profileId, name}` | 24 h | `/api/auth/login` | Login sessions. Expire on their own; logout deletes the key. | Ankita |
| `hold:{venueId}:{slotNo}` | String = designerId | 10 min | `/api/booking/hold` | Reserves a slot while the designer pays. `SET … NX EX 600` is atomic, so two designers can never hold the same slot. | Ankitha |
| `trending:collections` | Sorted set, member = collectionId, score = views | none | `/collections/[id]` | Live "most viewed" ranking. `ZINCRBY` per view, `ZREVRANGE` for the top 5. | Ankitha |

Code: `lib/redis.js`.

## Why Redis and not MySQL for these (viva answer)

- **Expiry is native.** Holds and sessions must disappear by themselves. In MySQL you would need a cron job or an event scheduler to delete expired rows; Redis does it with a TTL.
- **Atomic "take it if free".** `SET NX` checks and sets in one step, with no row locks and no race between two designers.
- **Rankings.** A sorted set keeps items ordered by score on every increment. In MySQL every page view would be an `UPDATE` plus an `ORDER BY` over the whole table.
- **Consistency.** A hold is advisory. If Redis lost a key, MySQL still blocks a double booking through `UNIQUE (Venue_ID, Slot_No)` on `ALLOCATED_TO` and the row lock inside `book_slot()`.

## Commands to show live in the demo

```bash
redis-cli KEYS '*'
redis-cli HGETALL session:<token>          # a logged-in user
redis-cli TTL session:<token>              # counts down from 86400
redis-cli SET hold:1:3 99 NX EX 600        # what the API does when a designer clicks "Hold slot"
redis-cli SET hold:1:3 42 NX EX 600        # second designer -> (nil): refused
redis-cli TTL hold:1:3                     # counts down from 600, then the key vanishes
redis-cli ZREVRANGE trending:collections 0 4 WITHSCORES
```

With Redis Cloud / Upstash, use `redis-cli -u $REDIS_URL …`.
