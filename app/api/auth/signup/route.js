// [Ankita] POST /api/auth/signup -> self-registration for DESIGNERS and MODELS only.
// Creates USER_ACCOUNT + the matching profile row in ONE transaction, then logs the user in.
// Admins and staff are never self-registered (they are created by an admin on /admin/users).
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { pool, dbErrorMessage } from '@/lib/db';
import { createSession, SESSION_TTL } from '@/lib/redis';
import { COOKIE, HOME_BY_ROLE, ok, fail } from '@/lib/auth';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const role = b.Role;
  const email = b.Email?.trim().toLowerCase();
  const name = b.Name?.trim();

  if (!['DESIGNER', 'MODEL'].includes(role)) return fail('You can only sign up as a designer or a model');
  if (!email || !b.Password || !name) return fail('Email, password and name are required');
  if (b.Password.length < 8) return fail('Password must be at least 8 characters');

  const hash = await bcrypt.hash(b.Password, 10);
  const conn = await pool.getConnection();
  let userId, profileId, displayName;
  try {
    await conn.beginTransaction();
    const [u] = await conn.query(
      'INSERT INTO USER_ACCOUNT (Email, Password_Hash, Role) VALUES (?, ?, ?)',
      [email, hash, role]
    );
    userId = u.insertId;

    if (role === 'DESIGNER') {
      // CHECK on Contact and UNIQUE on Brand_Name are enforced by MySQL
      const [d] = await conn.query(
        'INSERT INTO DESIGNER (Designer_Name, Brand_Name, Contact, User_ID) VALUES (?, ?, ?, ?)',
        [name, b.Brand_Name?.trim(), b.Contact?.trim(), userId]
      );
      profileId = d.insertId; displayName = b.Brand_Name?.trim();
    } else {
      const [m] = await conn.query(
        'INSERT INTO MODEL (Model_Name, Agency, Contact, User_ID) VALUES (?, ?, ?, ?)',
        [name, b.Agency?.trim(), b.Contact?.trim(), userId]
      );
      profileId = m.insertId; displayName = name;
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();            // no half-created account is left behind
    return fail(dbErrorMessage(e));
  } finally {
    conn.release();
  }

  // log the new user in straight away (same session model as /api/auth/login)
  const token = crypto.randomUUID();
  await createSession(token, { User_ID: userId, Role: role, Email: email, profileId, name: displayName });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL,
  });
  return ok({ redirect: HOME_BY_ROLE[role] });
}
