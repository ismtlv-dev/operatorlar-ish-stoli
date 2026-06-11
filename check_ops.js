import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const res = await pool.query('SELECT * FROM operators ORDER BY id::bigint ASC');
  console.log('Current operators in DB:', res.rows);
  await pool.end();
}
check().catch(console.error);
