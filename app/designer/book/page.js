// [Ankitha] The booking flow — the centrepiece of the demo.
//  Free slot ──Hold (Redis SET NX EX 600)──▶ Held by me ──Confirm (CALL book_slot)──▶ Booked
//                         └─ someone else holds it → "being booked"   └─ any error → ROLLBACK
import Shell, { inr, hm } from '@/components/Shell';
import ApiForm from '@/components/ApiForm';
import ApiButton from '@/components/ApiButton';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { getHold } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export default async function BookSlot() {
  const session = await requireRole('DESIGNER');
  const me = Number(session.profileId);

  const [freeSlots, unbooked] = await Promise.all([
    // LEFT JOIN … IS NULL: slots with no allocation
    query(`SELECT r.*, v.Venue_Name, v.Location
           FROM RUNWAY_SEGMENT r JOIN VENUE v ON v.Venue_ID = r.Venue_ID
           LEFT JOIN ALLOCATED_TO a ON a.Venue_ID = r.Venue_ID AND a.Slot_No = r.Slot_No
           WHERE a.Collection_ID IS NULL
           ORDER BY r.Slot_Date, r.Start_Time`),
    // NOT EXISTS: my collections that don't have a slot yet
    query(`SELECT Collection_ID, Collection_Name FROM COLLECTION c
           WHERE c.Designer_ID = ?
             AND NOT EXISTS (SELECT 1 FROM ALLOCATED_TO a WHERE a.Collection_ID = c.Collection_ID)`, [me]),
  ]);

  const holds = await Promise.all(freeSlots.map((s) => getHold(s.Venue_ID, s.Slot_No)));
  const collOpts = unbooked.map((c) => ({ value: c.Collection_ID, label: c.Collection_Name }));
  const modes = ['UPI', 'CARD', 'NETBANKING', 'BANK_TRANSFER'].map((x) => ({ value: x, label: x }));

  return (
    <Shell session={session} title="Book a runway slot">
      <p className="lead">
        1. <b>Hold</b> a slot — it is reserved for you in Redis for 10 minutes.&nbsp;
        2. <b>Confirm & pay</b> — MySQL runs <code>book_slot()</code>: payment, receipt and allocation in one transaction.
      </p>
      {!unbooked.length && <p className="msg err">All your collections already have a slot. Add a new collection first.</p>}

      <div className="slots">
        {freeSlots.map((s, i) => {
          const h = holds[i];
          const mine = h && h.owner === me;
          const other = h && !mine;
          return (
            <article key={`${s.Venue_ID}-${s.Slot_No}`} className={`slot ${mine ? 'mine' : ''} ${other ? 'locked' : ''}`}>
              <header>
                <span className="tag">{s.Segment_Type}</span>
                <b>{inr(s.Slot_Fee)}</b>
              </header>
              <h3>{s.Venue_Name}</h3>
              <p className="muted">{s.Location} · slot {s.Slot_No}</p>
              <p className="when">{s.Slot_Date} · {hm(s.Start_Time)}–{hm(s.End_Time)}</p>

              {!h && <ApiButton action="/api/booking/hold" body={{ Venue_ID: s.Venue_ID, Slot_No: s.Slot_No }}>Hold slot</ApiButton>}
              {other && <p className="msg err">Being booked by another designer · frees in {Math.ceil(h.ttl / 60)} min</p>}
              {mine && (
                <>
                  <p className="msg ok">Held for you · {Math.ceil(h.ttl / 60)} min left</p>
                  <ApiForm action="/api/booking/confirm" submit={`Pay ${inr(s.Slot_Fee)} & book`}
                    extra={{ Venue_ID: s.Venue_ID, Slot_No: s.Slot_No }}
                    fields={[
                      { name: 'Collection_ID', label: 'Collection', options: collOpts },
                      { name: 'Payment_Mode', label: 'Pay with', options: modes, defaultValue: 'UPI', placeholder: false },
                      { name: 'Rehearsal_Time', label: 'Rehearsal', type: 'datetime-local', defaultValue: `${s.Slot_Date}T08:00` },
                      { name: 'Show_Time', label: 'Show time', type: 'datetime-local', defaultValue: `${s.Slot_Date}T${hm(s.Start_Time)}` },
                    ]} />
                  <ApiButton action={`/api/booking/hold?venue=${s.Venue_ID}&slot=${s.Slot_No}`} method="DELETE" variant="ghost">Release hold</ApiButton>
                </>
              )}
            </article>
          );
        })}
      </div>
      {!freeSlots.length && <p className="muted">No free slots left.</p>}
    </Shell>
  );
}
