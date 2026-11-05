// [Ankita] POST /api/facilities (ADMIN) -> add a facility to a venue
import { query, dbErrorMessage } from '@/lib/db';
import { apiAuth, ok, fail } from '@/lib/auth';

export async function POST(req) {
  const { error } = await apiAuth('ADMIN');
  if (error) return error;
  const b = await req.json();
  try {
    await query('INSERT INTO FACILITY (Facility_Name, Facility_Type, Venue_ID) VALUES (?, ?, ?)', [
      b.Facility_Name?.trim(), b.Facility_Type, b.Venue_ID,
    ]);
    return ok({ message: 'Facility added' });
  } catch (e) {
    return fail(dbErrorMessage(e));
  }
}
