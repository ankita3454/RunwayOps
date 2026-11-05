// Redis client + the Redis data models used by the app.
//   session:{token}        HASH    TTL 24h   -> login sessions          (Ankita)
//   hold:{venue}:{slot}    STRING  TTL 10min -> slot hold while paying  (Ankitha)
//   trending:collections   ZSET    no TTL    -> live view ranking       (Ankitha)
import { createClient } from 'redis';

const globalForRedis = globalThis;

export async function getRedis() {
  if (!globalForRedis._redis) {
    const client = createClient({
      url: process.env.REDIS_URL,
      pingInterval: 60_000,   // keep cloud Redis from dropping an idle connection
      socket: { reconnectStrategy: (retries) => Math.min(retries * 500, 5_000) },
    });
    let lastError = '';
    client.on('error', (err) => {
      if (err.message !== lastError) console.error('Redis error', err.message);   // log once, not on every retry
      lastError = err.message;
    });
    client.on('ready', () => { lastError = ''; });
    globalForRedis._redis = client.connect().then(() => client);
  }
  return globalForRedis._redis;
}

export const SESSION_TTL = 60 * 60 * 24;   // 24 hours
export const HOLD_TTL = 60 * 10;           // 10 minutes

// ---------------- sessions ----------------
export async function createSession(token, user) {
  const r = await getRedis();
  const key = `session:${token}`;
  await r.hSet(key, {
    userId: String(user.User_ID),
    role: user.Role,
    email: user.Email,
    profileId: String(user.profileId ?? ''),
    name: user.name ?? '',
  });
  await r.expire(key, SESSION_TTL);
}

export async function readSession(token) {
  const r = await getRedis();
  const s = await r.hGetAll(`session:${token}`);
  return s && s.userId ? s : null;
}

export async function deleteSession(token) {
  const r = await getRedis();
  await r.del(`session:${token}`);
}

// ---------------- slot holds ----------------
const holdKey = (venueId, slotNo) => `hold:${venueId}:${slotNo}`;

// SET NX EX: atomic "take it only if nobody else has it", auto-expires
export async function placeHold(venueId, slotNo, designerId) {
  const r = await getRedis();
  const ok = await r.set(holdKey(venueId, slotNo), String(designerId), { NX: true, EX: HOLD_TTL });
  return ok === 'OK';
}

export async function getHold(venueId, slotNo) {
  const r = await getRedis();
  const [owner, ttl] = await Promise.all([
    r.get(holdKey(venueId, slotNo)),
    r.ttl(holdKey(venueId, slotNo)),
  ]);
  return owner ? { owner: Number(owner), ttl } : null;
}

export async function releaseHold(venueId, slotNo, designerId) {
  const r = await getRedis();
  const owner = await r.get(holdKey(venueId, slotNo));
  if (owner && Number(owner) === Number(designerId)) await r.del(holdKey(venueId, slotNo));
}

// ---------------- trending ----------------
export async function recordView(collectionId) {
  const r = await getRedis();
  await r.zIncrBy('trending:collections', 1, String(collectionId));
}

export async function topTrending(n = 5) {
  const r = await getRedis();
  const rows = await r.zRangeWithScores('trending:collections', 0, n - 1, { REV: true });
  return rows.map((x) => ({ collectionId: Number(x.value), views: x.score }));
}
