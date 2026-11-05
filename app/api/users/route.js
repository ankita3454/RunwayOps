// [Ankita] Admin-only account management.
// POST  -> create an ADMIN, or a STAFF login + STAFF row (one transaction)
// PATCH -> activate / deactivate an account (deactivating also logs it out everywhere)
// Designers and models are never created here; admins and staff are never self-registered.
import bcrypt from 'bcryptjs';
import { pool, query, dbErrorMessage } from '@/lib/db';
import { deleteUserSessions } from '@/lib/redis';
import { apiAuth, ok, fail } from '@/lib/auth';

export async function POST(req) {
  const { error } = await apiAuth('ADMIN');
  if (error) return error;
  const b = await req.json();

  const email = b.Email?.trim().toLowerCase();
  if (!email || !b.Password) return fail('Email and password are required');
  if (b.Password.length < 8) return fail('Password must be at least 8 characters');
  if (!['ADMIN', 'STAFF'].includes(b.Role)) return fail('Admins can only create ADMIN or STAFF accounts');

  const hash = await bcrypt.hash(b.Password, 10);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [u] = await conn.query(
      'INSERT INTO USER_ACCOUNT (Email, Password_Hash, Role) VALUES (?, ?, ?)',
      [email, hash, b.Role]
    );
    if (b.Role === 'STAFF') {
      // trg_supervisor_check still applies; if it rejects, the account is rolled back too
      await conn.query(
        'INSERT INTO STAFF (Staff_Name, Staff_Role, Contact, Supervisor_ID, User_ID) VALUES (?, ?, ?, ?, ?)',
        [b.Staff_Name?.trim(), b.Staff_Role, b.Contact?.trim(), b.Supervisor_ID || null, u.insertId]
      );
    }
    await conn.commit();
    return ok({ message: `${b.Role === 'ADMIN' ? 'Admin' : 'Staff'} account created for ${email}` });
  } catch (e) {
    await conn.rollback();
    return fail(dbErrorMessage(e));
  } finally {
    conn.release();
  }
}

export async function PATCH(req) {
  const { session, error } = await apiAuth('ADMIN');
  if (error) return error;
  const b = await req.json();
  const active = !!b.Is_Active;

  if (!active && String(b.User_ID) === session.userId) return fail('You cannot deactivate your own account');

  if (!active) {
    // never leave the system with no active admin
    const [{ n }] = await query(
      `SELECT COUNT(*) AS n FROM USER_ACCOUNT WHERE Role = 'ADMIN' AND Is_Active = TRUE AND User_ID <> ?`,
      [b.User_ID]
    );
    const [target] = await query('SELECT Role FROM USER_ACCOUNT WHERE User_ID = ?', [b.User_ID]);
    if (target?.Role === 'ADMIN' && n === 0) return fail('At least one active admin must remain');
  }

  await query('UPDATE USER_ACCOUNT SET Is_Active = ? WHERE User_ID = ?', [active, b.User_ID]);
  if (!active) await deleteUserSessions(b.User_ID);
  return ok({ message: active ? 'Account activated' : 'Account deactivated and logged out' });
}
