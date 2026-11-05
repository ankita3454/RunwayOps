// POST /api/auth/logout
import { cookies } from 'next/headers';
import { deleteSession } from '@/lib/redis';
import { COOKIE, ok } from '@/lib/auth';

export async function POST() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await deleteSession(token);
  store.delete(COOKIE);
  return ok({ redirect: '/login' });
}
