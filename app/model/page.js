// [Ankita] Model view: shows I walk in (WALKS_IN → ALLOCATED_TO) + facility bookings (USES)
import Shell, { Table, hm, dt } from '@/components/Shell';
import ApiForm from '@/components/ApiForm';
import ApiButton from '@/components/ApiButton';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ModelHome() {
  const session = await requireRole('MODEL');
  const me = session.profileId;
  const [shows, uses, facilities] = await Promise.all([
    query(`SELECT c.Collection_Name, d.Brand_Name, s.Venue_Name, s.Slot_Date, s.Start_Time, s.End_Time,
                  s.Rehearsal_Time, s.Show_Time
           FROM WALKS_IN w
           JOIN COLLECTION c ON c.Collection_ID = w.Collection_ID
           JOIN DESIGNER d   ON d.Designer_ID = c.Designer_ID
           LEFT JOIN v_show_schedule s ON s.Collection_ID = c.Collection_ID
           WHERE w.Model_ID = ? ORDER BY s.Slot_Date IS NULL, s.Slot_Date, s.Start_Time`, [me]),
    query(`SELECT u.*, f.Facility_Name, f.Facility_Type, v.Venue_Name
           FROM USES u JOIN FACILITY f ON f.Facility_ID = u.Facility_ID
           JOIN VENUE v ON v.Venue_ID = f.Venue_ID
           WHERE u.Model_ID = ? ORDER BY u.Usage_Date`, [me]),
    query(`SELECT f.Facility_ID, f.Facility_Name, f.Facility_Type, v.Venue_Name
           FROM FACILITY f JOIN VENUE v ON v.Venue_ID = f.Venue_ID ORDER BY v.Venue_Name`),
  ]);

  return (
    <Shell session={session} title={session.name}>
      <section className="panel">
        <h2>My shows</h2>
        <Table rows={shows} empty="You haven't been cast yet." cols={[
          { key: 'Collection_Name', label: 'Collection' },
          { key: 'Brand_Name', label: 'Brand' },
          { key: 'Venue_Name', label: 'Venue', render: (r) => r.Venue_Name || <span className="tag free">not scheduled</span> },
          { key: 'Slot_Date', label: 'Date' },
          { key: 't', label: 'Slot', render: (r) => r.Start_Time ? `${hm(r.Start_Time)}–${hm(r.End_Time)}` : '' },
          { key: 'r', label: 'Rehearsal', render: (r) => dt(r.Rehearsal_Time) },
        ]} />
      </section>
      <div className="grid2">
        <section className="panel">
          <h2>My facility bookings <small>M:N USES</small></h2>
          <Table rows={uses} empty="No bookings." cols={[
            { key: 'Usage_Date', label: 'Date' },
            { key: 'Facility_Name', label: 'Facility' },
            { key: 'Venue_Name', label: 'Venue' },
            { key: 'x', label: '', render: (u) => (
              <ApiButton action={`/api/uses?facility=${u.Facility_ID}&date=${u.Usage_Date}`} method="DELETE" variant="ghost danger">Remove</ApiButton>
            ) },
          ]} />
        </section>
        <section className="panel">
          <h2>Book a facility</h2>
          <ApiForm action="/api/uses" submit="Book" fields={[
            { name: 'Facility_ID', label: 'Facility', options: facilities.map((f) => ({ value: f.Facility_ID, label: `${f.Facility_Name} — ${f.Venue_Name}` })) },
            { name: 'Usage_Date', label: 'Date', type: 'date' },
          ]} />
        </section>
      </div>
    </Shell>
  );
}
