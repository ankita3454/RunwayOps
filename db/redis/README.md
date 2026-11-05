# Redis data model (NoSQL component)

Redis owns data that is **temporary, fast-changing or ranked**. MySQL stays the source of truth for anything permanent.

| Key pattern | Type | TTL | Written by | Purpose | Owner |
|---|---|---|---|---|---|
| `session:{token}` | Hash `{userId, role, email, profileId, name}` | 24 h | `/api/auth/login` | Login sessions. Expire on their own; logout deletes the key. | Ankita |

Code: `lib/redis.js`.

## Commands to show live in the demo

```bash
redis-cli KEYS '*'
redis-cli HGETALL session:<token>          # a logged-in user
redis-cli TTL session:<token>              # counts down from 86400
```

With Redis Cloud / Upstash, use `redis-cli -u $REDIS_URL …`.
