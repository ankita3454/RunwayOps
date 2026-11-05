// [Ankita] POST /api/slots (ADMIN) -> add a runway segment to a venue.
// Slot_No is the weak entity's partial key: next number WITHIN that venue.
// trg_no_slot_overlap rejects overlapping times; CHECKs reject bad times/fees.
import { pool, dbErrorMessage } from '@/lib/db';
import { apiAuth, ok, fail } from '@/lib/auth';

export async function POST(req) {
  const { error } = await apiAuth('ADMIN');
  if (error) return error;
  const b = await req.json();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[{ next }]] = await conn.query(
      'SELECT COALESCE(MAX(Slot_No), 0) + 1 AS next FROM RUNWAY_SEGMENT WHERE Venue_ID = ? FOR UPDATE',
      [b.Venue_ID]
    );
    await conn.query(
      `INSERT INTO RUNWAY_SEGMENT (Venue_ID, Slot_No, Segment_Type, Slot_Date, Start_Time, End_Time, Slot_Fee)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [b.Venue_ID, next, b.Segment_Type, b.Slot_Date, b.Start_Time, b.End_Time, b.Slot_Fee]
    );
    await conn.commit();
    return ok({ message: `Slot ${next} added` });
  } catch (e) {
    await conn.rollback();
    return fail(dbErrorMessage(e));
  } finally {
    conn.release();
  }
}
