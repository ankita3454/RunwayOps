// [Ankitha] POST /api/booking/confirm -> pay + allocate via CALL book_slot(...)
// 1. Redis: the designer must still own the hold (it may have expired)
// 2. MySQL: book_slot runs PAYMENT -> (trigger) RECEIPT -> ALLOCATED_TO as one transaction
// 3. Redis: release the hold on success
import { pool, dbErrorMessage } from '@/lib/db';
import { getHold, releaseHold } from '@/lib/redis';
import { apiAuth, ok, fail } from '@/lib/auth';

export async function POST(req) {
  const { session, error } = await apiAuth('DESIGNER');
  if (error) return error;
  const b = await req.json();
  const designerId = Number(session.profileId);

  const hold = await getHold(b.Venue_ID, b.Slot_No);
  if (!hold || hold.owner !== designerId) return fail('Your hold expired or belongs to someone else — hold the slot again', 409);

  const conn = await pool.getConnection();
  try {
    await conn.query('CALL book_slot(?, ?, ?, ?, ?, ?, ?, @pid, @rno)', [
      designerId, b.Collection_ID, b.Venue_ID, b.Slot_No, b.Payment_Mode,
      b.Rehearsal_Time?.replace('T', ' '), b.Show_Time?.replace('T', ' '),
    ]);
    const [[out]] = await conn.query('SELECT @pid AS paymentId, @rno AS receiptNo');
    await releaseHold(b.Venue_ID, b.Slot_No, designerId);
    return ok({ message: `Booked! Payment #${out.paymentId}, receipt #${out.receiptNo}`, ...out });
  } catch (e) {
    return fail(dbErrorMessage(e));   // procedure already rolled back
  } finally {
    conn.release();
  }
}
