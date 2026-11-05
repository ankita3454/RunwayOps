// Page frame: top bar with role nav + logout
import Link from 'next/link';
import ApiButton from './ApiButton';

const NAV = {
  ADMIN: [['/admin', 'Dashboard'], ['/admin/venues', 'Venues & slots'], ['/admin/staff', 'Staff'], ['/admin/users', 'Users'], ['/collections', 'Collections']],
  DESIGNER: [['/designer', 'My brand'], ['/designer/book', 'Book a slot'], ['/collections', 'Collections']],
  STAFF: [['/staff', 'Schedule & team'], ['/collections', 'Collections']],
  MODEL: [['/model', 'My shows'], ['/collections', 'Collections']],
};

export default function Shell({ session, title, children }) {
  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">Runway<b>Ops</b></Link>
        <nav>
          {(NAV[session.role] || []).map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
        <div className="who">
          <span>{session.name} · <em>{session.role.toLowerCase()}</em></span>
          <ApiButton action="/api/auth/logout" variant="ghost">Log out</ApiButton>
        </div>
      </header>
      <main className="page">
        {title && <h1>{title}</h1>}
        {children}
      </main>
    </>
  );
}

export function Table({ cols, rows, empty = 'Nothing here yet' }) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <div className="tablewrap">
      <table>
        <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{cols.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
export const hm = (t) => (t ? String(t).slice(0, 5) : '');
export const dt = (s) => (s ? String(s).slice(0, 16).replace('T', ' ') : '');
