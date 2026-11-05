// [Ankitha] Collection detail. Every visit does ZINCRBY trending:collections 1 <id>
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Shell, { hm, dt } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { recordView } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export default async function CollectionDetail({ params }) {
  const session = await requireRole();
  const { id } = await params;
  const [c] = await query(
    `SELECT c.*, d.Designer_Name, d.Brand_Name, s.Venue_Name, s.Slot_No, s.Slot_Date,
            s.Start_Time, s.End_Time, s.Segment_Type, s.Rehearsal_Time
     FROM COLLECTION c JOIN DESIGNER d ON d.Designer_ID = c.Designer_ID
     LEFT JOIN v_show_schedule s ON s.Collection_ID = c.Collection_ID
     WHERE c.Collection_ID = ?`, [id]);
  if (!c) notFound();

  await recordView(c.Collection_ID);
  const models = await query(
    `SELECT m.Model_Name, m.Agency FROM WALKS_IN w JOIN MODEL m ON m.Model_ID = w.Model_ID
     WHERE w.Collection_ID = ? ORDER BY m.Model_Name`, [id]);

  return (
    <Shell session={session}>
      <Link href="/collections" className="muted">← all collections</Link>
      <p className="eyebrow">{c.Brand_Name} · {c.Designer_Name} · {c.Season}</p>
      <h1>{c.Collection_Name}</h1>
      <p className="lead">{c.Theme}</p>
      <div className="grid2">
        <section className="panel">
          <h2>Runway slot</h2>
          {c.Venue_Name ? (
            <>
              <p><b>{c.Venue_Name}</b> · slot {c.Slot_No} ({c.Segment_Type})</p>
              <p>{c.Slot_Date} · {hm(c.Start_Time)}–{hm(c.End_Time)}</p>
              <p className="muted">Rehearsal {dt(c.Rehearsal_Time)}</p>
            </>
          ) : <p className="muted">Not booked yet.</p>}
        </section>
        <section className="panel">
          <h2>Walking ({models.length})</h2>
          <ul className="plain">{models.map((m) => <li key={m.Model_Name}>{m.Model_Name} <span className="muted">· {m.Agency}</span></li>)}</ul>
        </section>
      </div>
    </Shell>
  );
}
