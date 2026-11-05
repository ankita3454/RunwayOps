// [Ankita] Staff view: their own team (recursive CTE from themselves down) + show schedule
import Shell, { Table, hm, dt } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { SUBTREE_SQL } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function StaffHome() {
  const session = await requireRole('STAFF');
  const [[me], team, schedule] = await Promise.all([
    query(`SELECT s.*, sup.Staff_Name AS Supervisor_Name FROM STAFF s
           LEFT JOIN STAFF sup ON sup.Staff_ID = s.Supervisor_ID WHERE s.Staff_ID = ?`, [session.profileId]),
    query(SUBTREE_SQL, [session.profileId]),
    query('SELECT * FROM v_show_schedule ORDER BY Slot_Date, Start_Time'),
  ]);

  return (
    <Shell session={session} title={`Hi, ${me.Staff_Name}`}>
      <p className="lead">
        {me.Staff_Role.replaceAll('_', ' ').toLowerCase()}
        {me.Supervisor_Name ? <> · reports to <b>{me.Supervisor_Name}</b></> : ' · head of the backstage team'}
      </p>
      <section className="panel">
        <h2>My team <small>everyone below me, any depth — WITH RECURSIVE</small></h2>
        <Table rows={team} empty="No one reports to you." cols={[
          { key: 'Staff_Name', label: 'Name' },
          { key: 'Staff_Role', label: 'Role' },
          { key: 'Depth', label: 'Levels below me' },
          { key: 'Supervisor_Name', label: 'Direct supervisor' },
        ]} />
      </section>
      <section className="panel">
        <h2>Show schedule</h2>
        <Table rows={schedule} cols={[
          { key: 'Slot_Date', label: 'Date' },
          { key: 't', label: 'Slot', render: (r) => `${hm(r.Start_Time)}–${hm(r.End_Time)}` },
          { key: 'Venue_Name', label: 'Venue' },
          { key: 'Collection_Name', label: 'Collection' },
          { key: 'Brand_Name', label: 'Brand' },
          { key: 'r', label: 'Rehearsal', render: (r) => dt(r.Rehearsal_Time) },
        ]} />
      </section>
    </Shell>
  );
}
