// [Ankita] Admin: manage login accounts (create admins / staff logins, activate / deactivate)
import Shell, { Table, dt } from '@/components/Shell';
import ApiForm from '@/components/ApiForm';
import ApiButton from '@/components/ApiButton';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Users() {
  const session = await requireRole('ADMIN');

  const [accounts, directors, [counts]] = await Promise.all([
    // LEFT JOINs: an account links to at most one profile, depending on its role
    query(`SELECT u.User_ID, u.Email, u.Role, u.Is_Active, u.Created_At,
                  COALESCE(s.Staff_Name, d.Brand_Name, m.Model_Name, '—') AS Profile
           FROM USER_ACCOUNT u
           LEFT JOIN STAFF s    ON s.User_ID = u.User_ID
           LEFT JOIN DESIGNER d ON d.User_ID = u.User_ID
           LEFT JOIN MODEL m    ON m.User_ID = u.User_ID
           ORDER BY FIELD(u.Role, 'ADMIN', 'STAFF', 'DESIGNER', 'MODEL'), u.User_ID`),
    query(`SELECT Staff_ID, Staff_Name, Staff_Role FROM STAFF
           WHERE Staff_Role <> 'ASSISTANT_STYLIST' ORDER BY Staff_Name`),
    query(`SELECT SUM(Role='ADMIN') AS admins, SUM(Role='STAFF') AS staff,
                  SUM(Role='DESIGNER') AS designers, SUM(Role='MODEL') AS models,
                  SUM(Is_Active = FALSE) AS inactive
           FROM USER_ACCOUNT`),
  ]);

  const roles = ['SHOW_DIRECTOR', 'BACKSTAGE_COORDINATOR', 'ASSISTANT_STYLIST'].map((x) => ({ value: x, label: x }));
  const sup = [
    { value: '', label: '— none (Show Director only) —' },
    ...directors.map((s) => ({ value: s.Staff_ID, label: `${s.Staff_Name} (${s.Staff_Role})` })),
  ];

  return (
    <Shell session={session} title="User accounts">
      <section className="kpis">
        <div><span>Admins</span><b>{counts.admins}</b></div>
        <div><span>Staff</span><b>{counts.staff}</b></div>
        <div><span>Designers</span><b>{counts.designers}</b></div>
        <div><span>Models</span><b>{counts.models}</b></div>
        <div><span>Inactive</span><b>{counts.inactive}</b></div>
      </section>

      <div className="grid2">
        <section className="panel">
          <h2>Add admin</h2>
          <ApiForm action="/api/users" submit="Create admin" extra={{ Role: 'ADMIN' }} fields={[
            { name: 'Email', label: 'Email', type: 'email' },
            { name: 'Password', label: 'Password (8+ characters)', type: 'password' },
          ]} />
        </section>
        <section className="panel">
          <h2>Add staff login <small>account + staff row in one transaction</small></h2>
          <ApiForm action="/api/users" submit="Create staff account" extra={{ Role: 'STAFF' }} fields={[
            { name: 'Email', label: 'Email', type: 'email' },
            { name: 'Password', label: 'Password (8+ characters)', type: 'password' },
            { name: 'Staff_Name', label: 'Name' },
            { name: 'Staff_Role', label: 'Role', options: roles },
            { name: 'Contact', label: 'Phone (10 digits)' },
            { name: 'Supervisor_ID', label: 'Supervisor', options: sup, required: false, placeholder: false },
          ]} />
        </section>
      </div>

      <section className="panel">
        <h2>All accounts</h2>
        <Table rows={accounts} cols={[
          { key: 'User_ID', label: 'ID' },
          { key: 'Email', label: 'Email' },
          { key: 'Role', label: 'Role', render: (u) => <span className="tag">{u.Role}</span> },
          { key: 'Profile', label: 'Linked profile' },
          { key: 'Created_At', label: 'Created', render: (u) => dt(u.Created_At) },
          { key: 'Is_Active', label: 'Status', render: (u) => u.Is_Active
              ? <span className="tag st-SUCCESS">active</span>
              : <span className="tag st-FAILED">inactive</span> },
          { key: 'x', label: '', render: (u) => String(u.User_ID) === session.userId
              ? <span className="muted">you</span>
              : <ApiButton action="/api/users" method="PATCH" variant="ghost"
                  body={{ User_ID: u.User_ID, Is_Active: !u.Is_Active }}>
                  {u.Is_Active ? 'Deactivate' : 'Activate'}
                </ApiButton> },
        ]} />
      </section>
    </Shell>
  );
}
