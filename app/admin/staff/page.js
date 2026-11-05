// [Ankita] Staff hierarchy (recursive relationship) via WITH RECURSIVE
import Shell, { Table } from '@/components/Shell';
import ApiForm from '@/components/ApiForm';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { HIERARCHY_SQL } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const session = await requireRole('ADMIN');
  const tree = await query(HIERARCHY_SQL);
  const supervisorOpts = [
    { value: '', label: '— none (Show Director only) —' },
    ...tree.map((s) => ({ value: s.Staff_ID, label: `${s.Staff_Name} (${s.Staff_Role})` })),
  ];
  const staffOpts = tree.map((s) => ({ value: s.Staff_ID, label: s.Staff_Name }));
  const roles = ['SHOW_DIRECTOR', 'BACKSTAGE_COORDINATOR', 'ASSISTANT_STYLIST'].map((x) => ({ value: x, label: x }));

  return (
    <Shell session={session} title="Backstage staff">
      <section className="panel">
        <h2>Hierarchy <small>recursive SUPERVISES · WITH RECURSIVE query</small></h2>
        <ul className="tree">
          {tree.map((s) => (
            <li key={s.Staff_ID} style={{ paddingLeft: `${s.Level * 28}px` }}>
              <span className={`tag role-${s.Staff_Role}`}>{s.Staff_Role.replaceAll('_', ' ').toLowerCase()}</span>
              <b>{s.Staff_Name}</b> <span className="muted">#{s.Staff_ID} · {s.Contact}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid2">
        <section className="panel">
          <h2>Add staff <small>trigger blocks a stylist as supervisor</small></h2>
          <ApiForm action="/api/staff" submit="Add" fields={[
            { name: 'Staff_Name', label: 'Name' },
            { name: 'Staff_Role', label: 'Role', options: roles },
            { name: 'Contact', label: 'Phone (10 digits)' },
            { name: 'Supervisor_ID', label: 'Supervisor', options: supervisorOpts, required: false, placeholder: false },
          ]} />
        </section>
        <section className="panel">
          <h2>Change supervisor <small>UPDATE · trigger re-checks rules</small></h2>
          <ApiForm action="/api/staff" method="PATCH" submit="Update" fields={[
            { name: 'Staff_ID', label: 'Staff member', options: staffOpts },
            { name: 'Supervisor_ID', label: 'New supervisor', options: supervisorOpts, required: false, placeholder: false },
          ]} />
        </section>
      </div>

      <section className="panel">
        <h2>Flat view</h2>
        <Table rows={tree} cols={[
          { key: 'Staff_ID', label: 'ID' },
          { key: 'Staff_Name', label: 'Name' },
          { key: 'Staff_Role', label: 'Role' },
          { key: 'Level', label: 'Level' },
          { key: 'Supervisor_Name', label: 'Reports to' },
        ]} />
      </section>
    </Shell>
  );
}
