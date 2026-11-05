// [Ankitha] POST /api/collections (DESIGNER) -> add a collection to own brand
import { query, dbErrorMessage } from '@/lib/db';
import { apiAuth, ok, fail } from '@/lib/auth';

export async function POST(req) {
  const { session, error } = await apiAuth('DESIGNER');
  if (error) return error;
  const b = await req.json();
  try {
    await query(
      'INSERT INTO COLLECTION (Collection_Name, Theme, Season, Designer_ID) VALUES (?, ?, ?, ?)',
      [b.Collection_Name?.trim(), b.Theme?.trim(), b.Season?.trim().toUpperCase(), session.profileId]
    );
    return ok({ message: 'Collection added' });
  } catch (e) {
    return fail(dbErrorMessage(e));
  }
}

export async function DELETE(req) {
  const { session, error } = await apiAuth('DESIGNER');
  if (error) return error;
  const id = new URL(req.url).searchParams.get('id');
  try {
    const r = await query(
      `DELETE FROM COLLECTION WHERE Collection_ID = ? AND Designer_ID = ?
         AND NOT EXISTS (SELECT 1 FROM ALLOCATED_TO a WHERE a.Collection_ID = ?)`,
      [id, session.profileId, id]
    );
    if (!r.affectedRows) return fail('Cannot delete: collection is booked (cancel the booking first) or not yours');
    return ok({ message: 'Collection deleted' });
  } catch (e) {
    return fail(dbErrorMessage(e));
  }
}
