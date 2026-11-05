// [Ankitha] Designer home: own collections, bookings, payments + receipts, casting
import Shell, { Table, inr, dt } from '@/components/Shell';
import ApiForm from '@/components/ApiForm';
import ApiButton from '@/components/ApiButton';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DesignerHome() {
  const session = await requireRole('DESIGNER');
  const me = session.profileId;

  const [collections, payments, models, [stats]] = await Promise.all([
    query(`SELECT c.*, a.Venue_ID, a.Slot_No, a.Show_Time, v.Venue_Name,
                  (SELECT COUNT(*) FROM WALKS_IN w WHERE w.Collection_ID = c.Collection_ID) AS Models
           FROM COLLECTION c
           LEFT JOIN ALLOCATED_TO a ON a.Collection_ID = c.Collection_ID
           LEFT JOIN VENUE v ON v.Venue_ID = a.Venue_ID
           WHERE c.Designer_ID = ? ORDER BY c.Collection_ID`, [me]),
    query('SELECT * FROM v_designer_payments WHERE Designer_ID = ? ORDER BY Payment_Date DESC', [me]),
    query('SELECT Model_ID, Model_Name, Agency FROM MODEL ORDER BY Model_Name'),
    // stored function + subquery comparing me to the average designer
    query(`SELECT fn_designer_total_paid(?) AS mine,
                  (SELECT AVG(fn_designer_total_paid(Designer_ID)) FROM DESIGNER) AS avg_all`, [me]),
  ]);

  const collOpts = collections.map((c) => ({ value: c.Collection_ID, label: c.Collection_Name }));

  return (
    <Shell session={session} title={session.name}>
      <section className="kpis">
        <div><span>Collections</span><b>{collections.length}</b></div>
        <div><span>Booked shows</span><b>{collections.filter((c) => c.Venue_ID).length}</b></div>
        <div><span>Total paid</span><b>{inr(stats.mine)}</b></div>
        <div><span>Avg designer</span><b>{inr(stats.avg_all)}</b></div>
      </section>

      <section className="panel">
        <h2>My collections</h2>
        <Table rows={collections} cols={[
          { key: 'Collection_Name', label: 'Collection' },
          { key: 'Theme', label: 'Theme' },
          { key: 'Season', label: 'Season' },
          { key: 'Models', label: 'Models' },
          { key: 's', label: 'Show', render: (c) => c.Venue_ID
              ? <>{c.Venue_Name} · slot {c.Slot_No}<br /><span className="muted">{dt(c.Show_Time)}</span></>
              : <span className="tag free">not booked</span> },
          { key: 'x', label: '', render: (c) => c.Venue_ID
              ? <ApiButton action="/api/booking/cancel" body={{ Collection_ID: c.Collection_ID }} variant="ghost danger"
                  confirm="Cancel this booking? The payment is marked REFUNDED and the slot is freed.">Cancel booking</ApiButton>
              : <ApiButton action={`/api/collections?id=${c.Collection_ID}`} method="DELETE" variant="ghost danger"
                  confirm="Delete this collection?">Delete</ApiButton> },
        ]} />
        <h3>New collection</h3>
        <ApiForm action="/api/collections" submit="Add collection" inline fields={[
          { name: 'Collection_Name', label: 'Name' },
          { name: 'Theme', label: 'Theme' },
          { name: 'Season', label: 'Season', placeholder: 'e.g. SS27, AW26, RESORT27' },
        ]} />
      </section>

      <div className="grid2">
        <section className="panel">
          <h2>Payments & receipts <small>receipts made by trigger</small></h2>
          <Table rows={payments} cols={[
            { key: 'Payment_ID', label: '#' },
            { key: 'Venue_Name', label: 'Venue', render: (p) => `${p.Venue_Name} · ${p.Slot_No}` },
            { key: 'Amount', label: 'Amount', render: (p) => inr(p.Amount) },
            { key: 'Status', label: 'Status', render: (p) => <span className={`tag st-${p.Status}`}>{p.Status}</span> },
            { key: 'Receipt_No', label: 'Receipt', render: (p) => p.Receipt_No ? `R-${p.Receipt_No}` : '—' },
          ]} />
        </section>
        <section className="panel">
          <h2>Cast a model <small>M:N WALKS_IN</small></h2>
          <ApiForm action="/api/walks" submit="Cast" fields={[
            { name: 'Collection_ID', label: 'Collection', options: collOpts },
            { name: 'Model_ID', label: 'Model', options: models.map((m) => ({ value: m.Model_ID, label: `${m.Model_Name} (${m.Agency})` })) },
          ]} />
        </section>
      </div>
    </Shell>
  );
}
