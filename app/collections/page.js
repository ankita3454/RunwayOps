// [Ankitha] Collection catalogue: MySQL FULL-TEXT search + Redis trending (sorted set)
import Link from 'next/link';
import Shell from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { topTrending } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export default async function Collections({ searchParams }) {
  const session = await requireRole();
  const q = ((await searchParams)?.q || '').trim();

  const base = `SELECT c.Collection_ID, c.Collection_Name, c.Theme, c.Season, d.Brand_Name,
                       a.Venue_ID IS NOT NULL AS Booked`;
  const from = ` FROM COLLECTION c JOIN DESIGNER d ON d.Designer_ID = c.Designer_ID
                 LEFT JOIN ALLOCATED_TO a ON a.Collection_ID = c.Collection_ID`;
  const rows = q
    ? await query(
        `${base}, MATCH(c.Collection_Name, c.Theme) AGAINST (? IN NATURAL LANGUAGE MODE) AS Score ${from}
         WHERE MATCH(c.Collection_Name, c.Theme) AGAINST (? IN NATURAL LANGUAGE MODE)
         ORDER BY Score DESC`, [q, q])
    : await query(`${base} ${from} ORDER BY c.Collection_Name`);

  const trending = await topTrending(5);
  const names = trending.length
    ? await query('SELECT Collection_ID, Collection_Name FROM COLLECTION WHERE Collection_ID IN (?)', [trending.map((t) => t.collectionId)])
    : [];
  const nameOf = Object.fromEntries(names.map((n) => [n.Collection_ID, n.Collection_Name]));

  return (
    <Shell session={session} title="Collections">
      <div className="grid-side">
        <div>
          <form className="search">
            <input name="q" defaultValue={q} placeholder="Full-text search: e.g. silk, gothic, linen…" />
            <button>Search</button>
          </form>
          {q && <p className="muted">{rows.length} result(s) for “{q}” · MATCH … AGAINST, ranked by relevance</p>}
          <div className="cards">
            {rows.map((c) => (
              <Link key={c.Collection_ID} href={`/collections/${c.Collection_ID}`} className="ccard">
                <span className="muted">{c.Brand_Name} · {c.Season}</span>
                <h3>{c.Collection_Name}</h3>
                <p>{c.Theme}</p>
                {c.Booked ? <span className="tag st-SUCCESS">on the runway</span> : <span className="tag free">no slot yet</span>}
              </Link>
            ))}
          </div>
        </div>
        <aside className="panel">
          <h2>Trending <small>Redis ZSET</small></h2>
          {!trending.length && <p className="muted">Open a collection to start the ranking.</p>}
          <ol className="trend">
            {trending.map((t) => (
              <li key={t.collectionId}>
                <Link href={`/collections/${t.collectionId}`}>{nameOf[t.collectionId] || `#${t.collectionId}`}</Link>
                <em>{t.views} views</em>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </Shell>
  );
}
