// [Ankitha] POST /api/booking/cancel { Collection_ID } -> CALL cancel_booking (refund + free slot)
import { query, dbErrorMessage } from '@/lib/db';
import { apiAuth, ok, fail } from '@/lib/auth';

export async function POST(req) {
  const { session, error } = await apiAuth('DESIGNER');
  if (error) return error;
  const b = await req.json();
  try {
    await query('CALL cancel_booking(?, ?)', [session.profileId, b.Collection_ID]);
    return ok({ message: 'Booking cancelled and payment refunded' });
  } catch (e) {
    return fail(dbErrorMessage(e));
  }
}
