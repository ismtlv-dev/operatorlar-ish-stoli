import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const res = await pool.query('SELECT COUNT(*) FROM school_records');
  console.log('Current school records in DB:', res.rows[0].count);
  await pool.end();
}
check().catch(console.error);
