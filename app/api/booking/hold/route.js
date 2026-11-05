// [Ankitha] Slot hold in Redis while the designer pays.
// POST   { Venue_ID, Slot_No } -> SET hold:{v}:{s} designerId NX EX 600
// DELETE ?venue=&slot=        -> release own hold
import { query } from '@/lib/db';
import { placeHold, getHold, releaseHold } from '@/lib/redis';
import { apiAuth, ok, fail } from '@/lib/auth';

export async function POST(req) {
  const { session, error } = await apiAuth('DESIGNER');
  if (error) return error;
  const { Venue_ID, Slot_No } = await req.json();

  // MySQL is the source of truth: refuse to hold an already allocated slot
  const taken = await query('SELECT 1 FROM ALLOCATED_TO WHERE Venue_ID = ? AND Slot_No = ?', [Venue_ID, Slot_No]);
  if (taken.length) return fail('Slot is already booked');

  const got = await placeHold(Venue_ID, Slot_No, session.profileId);
  if (!got) {
    const h = await getHold(Venue_ID, Slot_No);
    if (h && h.owner === Number(session.profileId)) return ok({ message: 'You already hold this slot', ttl: h.ttl });
    return fail(`Slot is being booked by another designer (frees in ${h?.ttl ?? '?'}s)`, 409);
  }
  return ok({ message: 'Slot held for 10 minutes — confirm payment to book it' });
}

export async function DELETE(req) {
  const { session, error } = await apiAuth('DESIGNER');
  if (error) return error;
  const p = new URL(req.url).searchParams;
  await releaseHold(p.get('venue'), p.get('slot'), session.profileId);
  return ok({ message: 'Hold released' });
}
