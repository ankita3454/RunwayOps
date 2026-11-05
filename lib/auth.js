// Authentication + role-based authorisation (backend side).
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { readSession } from './redis';

export const COOKIE = 'rw_session';

export const HOME_BY_ROLE = {
  ADMIN: '/admin',
  DESIGNER: '/designer',
  STAFF: '/staff',
  MODEL: '/model',
};

export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return readSession(token);
}

// For pages (server components): redirect if not logged in / wrong role
export async function requireRole(...roles) {
  const s = await getSession();
  if (!s) redirect('/login');
  if (roles.length && !roles.includes(s.role)) redirect(HOME_BY_ROLE[s.role] || '/login');
  return s;
}

// For API route handlers: returns { session } or { error: Response }
export async function apiAuth(...roles) {
  const s = await getSession();
  if (!s) return { error: NextResponse.json({ error: 'Not logged in' }, { status: 401 }) };
  if (roles.length && !roles.includes(s.role))
    return { error: NextResponse.json({ error: `Forbidden for role ${s.role}` }, { status: 403 }) };
  return { session: s };
}

export const ok = (data = {}) => NextResponse.json({ ok: true, ...data });
export const fail = (msg, status = 400) => NextResponse.json({ error: msg }, { status });
