// [Ankita] Venues, runway segments (weak entity) and facilities
import Shell, { Table, inr, hm } from '@/components/Shell';
import ApiForm from '@/components/ApiForm';
import ApiButton from '@/components/ApiButton';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Venues() {
  const session = await requireRole('ADMIN');
  const [venues, slots, facilities] = await Promise.all([
    query('SELECT * FROM VENUE ORDER BY Venue_ID'),
    query(`SELECT r.*, v.Venue_Name, c.Collection_Name
           FROM RUNWAY_SEGMENT r JOIN VENUE v ON v.Venue_ID = r.Venue_ID
           LEFT JOIN ALLOCATED_TO a ON a.Venue_ID = r.Venue_ID AND a.Slot_No = r.Slot_No
           LEFT JOIN COLLECTION c ON c.Collection_ID = a.Collection_ID
           ORDER BY r.Venue_ID, r.Slot_No`),
    query(`SELECT f.*, v.Venue_Name, COUNT(u.Model_ID) AS Bookings
           FROM FACILITY f JOIN VENUE v ON v.Venue_ID = f.Venue_ID
           LEFT JOIN USES u ON u.Facility_ID = f.Facility_ID
           GROUP BY f.Facility_ID ORDER BY f.Venue_ID`),
  ]);
  const venueOpts = venues.map((v) => ({ value: v.Venue_ID, label: v.Venue_Name }));

  return (
    <Shell session={session} title="Venues & runway slots">
      <section className="panel">
        <h2>Venues</h2>
        <Table
          rows={venues}
          cols={[
            { key: 'Venue_ID', label: 'ID' },
            { key: 'Venue_Name', label: 'Name' },
            { key: 'Location', label: 'City' },
            { key: 'Capacity', label: 'Capacity' },
            {
              key: 'x', label: '',
              render: (v) => (
                <ApiButton action={`/api/venues?id=${v.Venue_ID}`} method="DELETE" variant="ghost danger"
                  confirm="Delete venue? Its slots and facilities are removed too (ON DELETE CASCADE).">Delete</ApiButton>
              ),
            },
          ]}
        />
        <h3>Add venue</h3>
        <ApiForm action="/api/venues" submit="Add venue" inline fields={[
          { name: 'Venue_Name', label: 'Name' },
          { name: 'Location', label: 'City' },
          { name: 'Capacity', label: 'Capacity', type: 'number' },
        ]} />
      </section>

      <section className="panel">
        <h2>Runway segments <small>weak entity · key (Venue_ID, Slot_No)</small></h2>
        <Table
          rows={slots}
          cols={[
            { key: 'Venue_Name', label: 'Venue' },
            { key: 'Slot_No', label: 'Slot' },
            { key: 'Segment_Type', label: 'Type' },
            { key: 'Slot_Date', label: 'Date' },
            { key: 't', label: 'Time', render: (r) => `${hm(r.Start_Time)}–${hm(r.End_Time)}` },
            { key: 'Slot_Fee', label: 'Fee', render: (r) => inr(r.Slot_Fee) },
            { key: 'c', label: 'Booked by', render: (r) => r.Collection_Name || <span className="tag free">free</span> },
          ]}
        />
        <h3>Add segment <small>try overlapping times — the trigger rejects it</small></h3>
        <ApiForm action="/api/slots" submit="Add slot" inline fields={[
          { name: 'Venue_ID', label: 'Venue', options: venueOpts },
          { name: 'Segment_Type', label: 'Type', options: ['OPENING', 'MAIN', 'FINALE', 'CAPSULE'].map((x) => ({ value: x, label: x })) },
          { name: 'Slot_Date', label: 'Date', type: 'date' },
          { name: 'Start_Time', label: 'Start', type: 'time' },
          { name: 'End_Time', label: 'End', type: 'time' },
          { name: 'Slot_Fee', label: 'Fee (₹)', type: 'number' },
        ]} />
      </section>

      <section className="panel">
        <h2>Facilities</h2>
        <Table
          rows={facilities}
          cols={[
            { key: 'Venue_Name', label: 'Venue' },
            { key: 'Facility_Name', label: 'Facility' },
            { key: 'Facility_Type', label: 'Type' },
            { key: 'Bookings', label: 'Model bookings' },
          ]}
        />
        <h3>Add facility</h3>
        <ApiForm action="/api/facilities" submit="Add facility" inline fields={[
          { name: 'Venue_ID', label: 'Venue', options: venueOpts },
          { name: 'Facility_Name', label: 'Name' },
          { name: 'Facility_Type', label: 'Type', options: ['BACKSTAGE_LOUNGE', 'PRESS_PIT', 'HAIR_MAKEUP_BAY'].map((x) => ({ value: x, label: x })) },
        ]} />
      </section>
    </Shell>
  );
}
