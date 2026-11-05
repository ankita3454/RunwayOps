// [Ankita] Admin dashboard: views v_slot_utilisation, v_venue_revenue, v_show_schedule
// + GROUP BY/HAVING query and the stored function fn_designer_total_paid
import Shell, { Table, inr, hm, dt } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const session = await requireRole('ADMIN');

  const [util, revenue, schedule, topDesigners, [kpi]] = await Promise.all([
    query('SELECT * FROM v_slot_utilisation ORDER BY Utilisation_Pct DESC'),
    query('SELECT * FROM v_venue_revenue ORDER BY Revenue DESC'),
    query('SELECT * FROM v_show_schedule ORDER BY Slot_Date, Start_Time'),
    // GROUP BY + HAVING: designers who have spent at least 1,00,000
    query(`SELECT d.Brand_Name, COUNT(p.Payment_ID) AS Bookings, SUM(p.Amount) AS Spent
           FROM PAYMENT p JOIN DESIGNER d ON d.Designer_ID = p.Designer_ID
           WHERE p.Status = 'SUCCESS'
           GROUP BY d.Designer_ID, d.Brand_Name
           HAVING SUM(p.Amount) >= 100000
           ORDER BY Spent DESC`),
    query(`SELECT (SELECT COUNT(*) FROM RUNWAY_SEGMENT) AS slots,
                  (SELECT COUNT(*) FROM ALLOCATED_TO)   AS booked,
                  (SELECT COALESCE(SUM(Amount),0) FROM PAYMENT WHERE Status='SUCCESS') AS revenue,
                  (SELECT COUNT(*) FROM DESIGNER)       AS designers`),
  ]);

  const maxRev = Math.max(1, ...revenue.map((r) => Number(r.Revenue)));

  return (
    <Shell session={session} title="Show director dashboard">
      <section className="kpis">
        <div><span>Slots</span><b>{kpi.slots}</b></div>
        <div><span>Booked</span><b>{kpi.booked}</b></div>
        <div><span>Revenue</span><b>{inr(kpi.revenue)}</b></div>
        <div><span>Designers</span><b>{kpi.designers}</b></div>
      </section>

      <div className="grid2">
        <section className="panel">
          <h2>Slot utilisation <small>view v_slot_utilisation</small></h2>
          {util.map((u) => (
            <div key={u.Venue_ID} className="bar">
              <span>{u.Venue_Name}</span>
              <div className="track"><div style={{ width: `${u.Utilisation_Pct || 0}%` }} /></div>
              <em>{u.Booked_Slots}/{u.Total_Slots}</em>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Revenue by venue <small>view v_venue_revenue</small></h2>
          {revenue.map((r) => (
            <div key={r.Venue_ID} className="bar">
              <span>{r.Venue_Name}</span>
              <div className="track"><div style={{ width: `${(100 * r.Revenue) / maxRev}%` }} /></div>
              <em>{inr(r.Revenue)}</em>
            </div>
          ))}
        </section>
      </div>

      <section className="panel">
        <h2>Show schedule <small>view v_show_schedule · 5-table JOIN</small></h2>
        <Table
          rows={schedule}
          cols={[
            { key: 'Slot_Date', label: 'Date' },
            { key: 't', label: 'Time', render: (r) => `${hm(r.Start_Time)}–${hm(r.End_Time)}` },
            { key: 'Venue_Name', label: 'Venue' },
            { key: 'Segment_Type', label: 'Segment' },
            { key: 'Collection_Name', label: 'Collection' },
            { key: 'Brand_Name', label: 'Brand' },
            { key: 'r', label: 'Rehearsal', render: (r) => dt(r.Rehearsal_Time) },
          ]}
        />
      </section>

      <section className="panel">
        <h2>Top spending designers <small>GROUP BY … HAVING SUM ≥ ₹1,00,000</small></h2>
        <Table
          rows={topDesigners}
          cols={[
            { key: 'Brand_Name', label: 'Brand' },
            { key: 'Bookings', label: 'Bookings' },
            { key: 'Spent', label: 'Spent', render: (r) => inr(r.Spent) },
          ]}
        />
      </section>
    </Shell>
  );
}
