// [Ankitha] Cast a model in one of the designer's own collections (M:N WALKS_IN)
import { query, dbErrorMessage } from '@/lib/db';
import { apiAuth, ok, fail } from '@/lib/auth';

export async function POST(req) {
  const { session, error } = await apiAuth('DESIGNER');
  if (error) return error;
  const b = await req.json();
  const own = await query('SELECT 1 FROM COLLECTION WHERE Collection_ID = ? AND Designer_ID = ?', [
    b.Collection_ID, session.profileId,
  ]);
  if (!own.length) return fail('Not your collection', 403);
  try {
    await query('INSERT INTO WALKS_IN (Model_ID, Collection_ID) VALUES (?, ?)', [b.Model_ID, b.Collection_ID]);
    return ok({ message: 'Model cast' });
  } catch (e) {
    return fail(dbErrorMessage(e));
  }
}
