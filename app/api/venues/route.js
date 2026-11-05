// [Ankita] POST /api/venues  (ADMIN) -> create venue   | DELETE ?id= -> delete venue (cascades slots)
import { query, dbErrorMessage } from '@/lib/db';
import { apiAuth, ok, fail } from '@/lib/auth';

export async function POST(req) {
  const { error } = await apiAuth('ADMIN');
  if (error) return error;
  const b = await req.json();
  try {
    const r = await query('INSERT INTO VENUE (Venue_Name, Location, Capacity) VALUES (?, ?, ?)', [
      b.Venue_Name?.trim(), b.Location?.trim(), Number(b.Capacity),
    ]);
    return ok({ id: r.insertId, message: 'Venue added' });
  } catch (e) {
    return fail(dbErrorMessage(e));
  }
}

export async function DELETE(req) {
  const { error } = await apiAuth('ADMIN');
  if (error) return error;
  const id = new URL(req.url).searchParams.get('id');
  try {
    await query('DELETE FROM VENUE WHERE Venue_ID = ?', [id]);
    return ok({ message: 'Venue deleted' });
  } catch (e) {
    return fail(dbErrorMessage(e));
  }
}
