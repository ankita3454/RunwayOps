// MySQL connection pool. Credentials come ONLY from environment variables.
import mysql from 'mysql2/promise';

const globalForDb = globalThis;

export const pool =
  globalForDb._mysqlPool ||
  mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'runwayops',
    connectionLimit: 10,
    dateStrings: true,          // DATE/DATETIME come back as plain strings
    decimalNumbers: true,
  });

if (process.env.NODE_ENV !== 'production') globalForDb._mysqlPool = pool;

// Parameterised query helper -> always use ? placeholders (prevents SQL injection)
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// Turns a MySQL error (CHECK, FK, UNIQUE, SIGNAL from a trigger) into a readable message
export function dbErrorMessage(e) {
  if (!e) return 'Unknown error';
  if (e.sqlState === '45000') return e.sqlMessage;                       // our triggers/procedures
  if (e.code === 'ER_CHECK_CONSTRAINT_VIOLATED') return `Rejected by database rule: ${e.sqlMessage}`;
  if (e.code === 'ER_DUP_ENTRY') return `Already exists: ${e.sqlMessage}`;
  if (e.code === 'ER_NO_REFERENCED_ROW_2') return 'Referenced record does not exist';
  if (e.code === 'ER_ROW_IS_REFERENCED_2') return 'Cannot delete: other records depend on this one';
  if (e.code === 'ER_TRUNCATED_WRONG_VALUE' || e.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD')
    return `Invalid value: ${e.sqlMessage}`;
  return e.sqlMessage || e.message;
}
