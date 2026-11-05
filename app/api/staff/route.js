// [Ankita] POST /api/staff (ADMIN) -> add staff member; PATCH -> change supervisor.
// trg_supervisor_check / trg_supervisor_check_upd enforce the hierarchy rules.
import { query, dbErrorMessage } from '@/lib/db';
import { apiAuth, ok, fail } from '@/lib/auth';

export async function POST(req) {
  const { error } = await apiAuth('ADMIN');
  if (error) return error;
  const b = await req.json();
  try {
    await query(
      'INSERT INTO STAFF (Staff_Name, Staff_Role, Contact, Supervisor_ID) VALUES (?, ?, ?, ?)',
      [b.Staff_Name?.trim(), b.Staff_Role, b.Contact?.trim(), b.Supervisor_ID || null]
    );
    return ok({ message: 'Staff member added' });
  } catch (e) {
    return fail(dbErrorMessage(e));
  }
}

export async function PATCH(req) {
  const { error } = await apiAuth('ADMIN');
  if (error) return error;
  const b = await req.json();
  try {
    await query('UPDATE STAFF SET Supervisor_ID = ? WHERE Staff_ID = ?', [b.Supervisor_ID || null, b.Staff_ID]);
    return ok({ message: 'Supervisor updated' });
  } catch (e) {
    return fail(dbErrorMessage(e));
  }
}
