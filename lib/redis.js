// Redis client + the Redis data models used by the app.
//   session:{token}        HASH    TTL 24h   -> login sessions          (Ankita)
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
