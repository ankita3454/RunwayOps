// [Ankita] Public sign-up page: designers and models register themselves.
// Step 1: /signup            -> choose "Designer" or "Model"
// Step 2: /signup?as=designer | /signup?as=model -> only that role's details
import Link from 'next/link';
import { redirect } from 'next/navigation';
import ApiForm from '@/components/ApiForm';
import { getSession, HOME_BY_ROLE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ROLES = {
  designer: {
    role: 'DESIGNER',
    title: "I'm a designer",
    blurb: 'Add your collections, book runway slots and cast models.',
    submit: 'Create designer account',
    extra: [
      { name: 'Name', label: 'Your name' },
      { name: 'Brand_Name', label: 'Brand name' },
      { name: 'Contact', label: 'Phone (10 digits)' },
    ],
  },
  model: {
    role: 'MODEL',
    title: "I'm a model",
    blurb: 'See the shows you walk in and book hair, makeup and lounge facilities.',
    submit: 'Create model account',
    extra: [
      { name: 'Name', label: 'Your name' },
      { name: 'Agency', label: 'Agency' },
      { name: 'Contact', label: 'Phone (10 digits)' },
    ],
  },
};

export default async function Signup({ searchParams }) {
  const s = await getSession();
  if (s) redirect(HOME_BY_ROLE[s.role]);

  const as = (await searchParams)?.as;
  const pick = ROLES[as];

  return (
    <main className="login">
      <div className="card">
        <p className="eyebrow">Fashion Week Management</p>
        <h1 className="logo">Runway<b>Ops</b></h1>

        {!pick ? (
          <>
            <h2 className="step">Who are you signing up as?</h2>
            <div className="choices">
              {Object.entries(ROLES).map(([key, r]) => (
                <Link key={key} href={`/signup?as=${key}`} className="choice">
                  <b>{r.title.replace("I'm a ", '').replace(/^./, (c) => c.toUpperCase())}</b>
                  <span>{r.blurb}</span>
                </Link>
              ))}
            </div>
            <p className="muted small-note">Admin and staff accounts are created by the show director.</p>
          </>
        ) : (
          <>
            <p className="switch top"><Link href="/signup">← Change</Link></p>
            <h2 className="step">{pick.title}</h2>
            <ApiForm action="/api/auth/signup" submit={pick.submit} extra={{ Role: pick.role }} fields={[
              { name: 'Email', label: 'Email', type: 'email' },
              { name: 'Password', label: 'Password (8+ characters)', type: 'password' },
              ...pick.extra,
            ]} />
          </>
        )}

        <p className="switch">Already have an account? <Link href="/login">Log in</Link></p>
      </div>
    </main>
  );
}
