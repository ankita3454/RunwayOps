// Runs db/mysql/01..05 against the MySQL server in .env.local
// Usage: npm run db:setup      (works without the mysql CLI on PATH)
// It understands DELIMITER blocks, so triggers/procedures load correctly.
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const FILES = [
  '01_schema.sql',
  '02_triggers.sql',
  '03_procedures.sql',
  '04_views_indexes.sql',
  '05_seed.sql',
];

function splitStatements(sql) {
  const out = [];
  let delimiter = ';';
  let buf = [];
  for (const raw of sql.split('\n')) {
    const line = raw.replace(/\r$/, '');
    const m = line.trim().match(/^DELIMITER\s+(\S+)/i);
    if (m) { delimiter = m[1]; continue; }
    if (!buf.length && (line.trim() === '' || line.trim().startsWith('--'))) continue;
    buf.push(line);
    const code = line.replace(/\s--\s.*$/, '');   // ignore trailing comments
    if (code.trimEnd().endsWith(delimiter)) {
      buf[buf.length - 1] = code;
      let stmt = buf.join('\n').trimEnd();
      stmt = stmt.slice(0, stmt.length - delimiter.length).trim();
      if (stmt) out.push(stmt);
      buf = [];
    }
  }
  if (buf.join('').trim()) out.push(buf.join('\n').trim());
  return out;
}

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
});

const [[{ v }]] = await conn.query('SELECT VERSION() AS v');
console.log(`Connected to MySQL ${v}`);
const [maj, min, patch] = v.split(/[.-]/).map(Number);
if (maj < 8 || (maj === 8 && min === 0 && patch < 16)) {
  console.warn('WARNING: MySQL < 8.0.16 silently ignores CHECK constraints. Upgrade before the demo.');
}

for (const file of FILES) {
  const sql = fs.readFileSync(path.join('db', 'mysql', file), 'utf8');
  const stmts = splitStatements(sql);
  for (const s of stmts) {
    try {
      await conn.query(s);
    } catch (e) {
      console.error(`\n✗ ${file} failed on:\n${s.slice(0, 300)}\n→ ${e.message}`);
      process.exit(1);
    }
  }
  console.log(`✓ ${file} (${stmts.length} statements)`);
}

if (process.env.MYSQL_DATABASE && process.env.MYSQL_DATABASE !== 'runwayops') {
  console.warn('Note: the scripts create a database named "runwayops"; set MYSQL_DATABASE=runwayops');
}
await conn.end();
console.log('\nDatabase ready. Logins: admin@runwayops.in / admin123, others / password123');
