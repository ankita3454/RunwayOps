// [Ankita] POST /api/uses (MODEL) -> book a facility for a day (M:N USES)
import { query, dbErrorMessage } from '@/lib/db';
import { apiAuth, ok, fail } from '@/lib/auth';

export async function POST(req) {
  const { session, error } = await apiAuth('MODEL');
  if (error) return error;
  const b = await req.json();
  try {
    await query('INSERT INTO USES (Model_ID, Facility_ID, Usage_Date) VALUES (?, ?, ?)', [
      session.profileId, b.Facility_ID, b.Usage_Date,
    ]);
    return ok({ message: 'Facility booked' });
  } catch (e) {
    return fail(dbErrorMessage(e));
  }
}

export async function DELETE(req) {
  const { session, error } = await apiAuth('MODEL');
  if (error) return error;
  const p = new URL(req.url).searchParams;
  await query('DELETE FROM USES WHERE Model_ID = ? AND Facility_ID = ? AND Usage_Date = ?', [
    session.profileId, p.get('facility'), p.get('date'),
  ]);
  return ok({ message: 'Removed' });
}
