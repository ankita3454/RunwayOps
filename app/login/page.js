import Link from 'next/link';
import ApiForm from '@/components/ApiForm';

export default function Login() {
  return (
    <main className="login">
      <div className="card">
        <p className="eyebrow">Fashion Week Management</p>
        <h1 className="logo">Runway<b>Ops</b></h1>
        <ApiForm
          action="/api/auth/login"
          submit="Log in"
          fields={[
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'password', label: 'Password', type: 'password' },
          ]}
        />
        <p className="switch">New designer or model? <Link href="/signup">Sign up</Link></p>
        <details className="demo">
          <summary>Demo accounts</summary>
          <ul>
            <li><b>Admin</b> admin@runwayops.in / admin123</li>
            <li><b>Designer</b> aarav@noir.in / password123</li>
            <li><b>Designer</b> meera@kesari.in / password123</li>
            <li><b>Staff</b> kavya.staff@runwayops.in / password123</li>
            <li><b>Model</b> tara@elitemodels.in / password123</li>
          </ul>
        </details>
      </div>
    </main>
  );
}
