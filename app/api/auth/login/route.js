// POST /api/auth/login  { email, password }
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { createSession, SESSION_TTL } from '@/lib/redis';
import { COOKIE, HOME_BY_ROLE, ok, fail } from '@/lib/auth';

export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return fail('Email and password are required');

  const rows = await query(
    'SELECT User_ID, Email, Password_Hash, Role, Is_Active FROM USER_ACCOUNT WHERE Email = ?',
    [email.trim().toLowerCase()]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.Password_Hash))) return fail('Invalid email or password', 401);
  if (!user.Is_Active) return fail('Account disabled', 403);

  // find the role-specific profile (Designer_ID / Staff_ID / Model_ID)
  let profile = { id: '', name: 'Admin' };
  const lookups = {
    DESIGNER: 'SELECT Designer_ID AS id, Brand_Name AS name FROM DESIGNER WHERE User_ID = ?',
    STAFF: 'SELECT Staff_ID AS id, Staff_Name AS name FROM STAFF WHERE User_ID = ?',
    MODEL: 'SELECT Model_ID AS id, Model_Name AS name FROM MODEL WHERE User_ID = ?',
  };
  if (lookups[user.Role]) {
    const p = await query(lookups[user.Role], [user.User_ID]);
    if (!p[0]) return fail('No profile linked to this account', 403);
    profile = p[0];
  }

  const token = crypto.randomUUID();
  await createSession(token, { ...user, profileId: profile.id, name: profile.name });

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL,
  });
  return ok({ redirect: HOME_BY_ROLE[user.Role] });
}
