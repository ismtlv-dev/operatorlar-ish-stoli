/**
 * Operatorlar Ish Stoli — Neon Postgres API serveri
 *
 * Ishga tushirish:  node server.mjs   (yoki: npm run server)
 * .env faylida DATABASE_URL bo'lishi shart.
 *
 * Arxitektura: brauzer hech qachon Postgres'ga to'g'ridan-to'g'ri ulanmaydi —
 * ulanish satri faqat shu serverda saqlanadi. Frontend /api/* orqali ishlaydi.
 * Har bir tahrir faqat BITTA yozuvni yangilaydi (butun bazani emas) —
 * Neon Free plan (100 CU-soat, 5GB transfer) uchun tejamkor.
 */
import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('XATO: .env faylida DATABASE_URL topilmadi!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30_000,
});

// ---------- Sxema ----------
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS operators (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      password   TEXT NOT NULL DEFAULT '123456',
      ord        INT  NOT NULL DEFAULT 0,
      updated_at BIGINT NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS records (
      id            TEXT PRIMARY KEY,
      operator_id   TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
      num           INT  NOT NULL DEFAULT 0,
      viloyat       TEXT NOT NULL DEFAULT '',
      fish          TEXT NOT NULL DEFAULT '',
      tugulgan_sana TEXT NOT NULL DEFAULT '',
      tel           TEXT NOT NULL DEFAULT '',
      tel_qoshimcha TEXT NOT NULL DEFAULT '',
      natija        TEXT NOT NULL DEFAULT '',
      izoh          TEXT NOT NULL DEFAULT '',
      sana          TEXT NOT NULL DEFAULT '',
      updated_at    BIGINT NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_records_op  ON records(operator_id);
    CREATE INDEX IF NOT EXISTS idx_records_upd ON records(updated_at);

    CREATE TABLE IF NOT EXISTS activity_logs (
      id            TEXT PRIMARY KEY,
      operator_id   TEXT NOT NULL DEFAULT '',
      operator_name TEXT NOT NULL DEFAULT '',
      school_name   TEXT NOT NULL DEFAULT '',
      field         TEXT NOT NULL DEFAULT '',
      old_value     TEXT NOT NULL DEFAULT '',
      new_value     TEXT NOT NULL DEFAULT '',
      ts            TEXT NOT NULL DEFAULT '',
      created_at    BIGINT NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at);

    CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      sender_id       TEXT NOT NULL DEFAULT '',
      sender_name     TEXT NOT NULL DEFAULT '',
      text            TEXT NOT NULL DEFAULT '',
      ts              TEXT NOT NULL DEFAULT '',
      is_announcement BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      BIGINT NOT NULL DEFAULT 0
    );
  `);
}

// ---------- Maperlar (snake_case <-> camelCase) ----------
const recordToJs = (r) => ({
  id: r.id,
  no: r.num,
  viloyat: r.viloyat,
  fish: r.fish,
  tugulganSana: r.tugulgan_sana,
  tel: r.tel,
  telQoshimcha: r.tel_qoshimcha,
  natija: r.natija,
  izoh: r.izoh,
  sana: r.sana || ''
});

const logToJs = (l) => ({
  id: l.id,
  operatorId: l.operator_id,
  operatorName: l.operator_name,
  schoolName: l.school_name,
  field: l.field,
  oldValue: l.old_value,
  newValue: l.new_value,
  timestamp: l.ts
});

const messageToJs = (m) => ({
  id: m.id,
  senderId: m.sender_id,
  senderName: m.sender_name,
  text: m.text,
  timestamp: m.ts,
  isAnnouncement: m.is_announcement
});

// Frontend maydon nomi -> jadval ustuni (PUT /records/:id uchun oq ro'yxat)
const FIELD_COLUMNS = {
  viloyat: 'viloyat',
  fish: 'fish',
  tugulganSana: 'tugulgan_sana',
  tel: 'tel',
  telQoshimcha: 'tel_qoshimcha',
  natija: 'natija',
  izoh: 'izoh',
  sana: 'sana'
};

// Yozuvlarni bo'lib-bo'lib (chunk) kiritish — 2000 ta yozuv ham tez ketadi
async function insertRecords(client, operatorId, records, now) {
  const CHUNK = 200;
  for (let i = 0; i < records.length; i += CHUNK) {
    const slice = records.slice(i, i + CHUNK);
    const placeholders = [];
    const params = [];
    slice.forEach((r, j) => {
      const b = j * 12;
      placeholders.push(
        `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11},$${b + 12})`
      );
      params.push(
        r.id, operatorId, r.no || 0,
        r.viloyat || '', r.fish || '', r.tugulganSana || '',
        r.tel || '', r.telQoshimcha || '', r.natija || '', r.izoh || '',
        r.sana || '', now
      );
    });
    await client.query(
      `INSERT INTO records (id, operator_id, num, viloyat, fish, tugulgan_sana, tel, tel_qoshimcha, natija, izoh, sana, updated_at)
       VALUES ${placeholders.join(',')}
       ON CONFLICT (id) DO NOTHING`,
      params
    );
  }
}

// ---------- HTTP server ----------
const app = express();
app.use(express.json({ limit: '20mb' }));

// To'liq holat: operatorlar (yozuvlari bilan) + oxirgi 500 jurnal
app.get('/api/state', async (_req, res) => {
  try {
    const [ops, recs, logs] = await Promise.all([
      pool.query('SELECT * FROM operators ORDER BY ord, id'),
      pool.query('SELECT * FROM records ORDER BY operator_id, num'),
      pool.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 500')
    ]);

    const recsByOp = new Map();
    recs.rows.forEach(r => {
      if (!recsByOp.has(r.operator_id)) recsByOp.set(r.operator_id, []);
      recsByOp.get(r.operator_id).push(recordToJs(r));
    });

    const operators = ops.rows.map(o => ({
      id: o.id,
      name: o.name,
      password: o.password,
      records: recsByOp.get(o.id) || []
    }));

    res.json({ operators, logs: logs.rows.map(logToJs), serverTime: Date.now() });
  } catch (err) {
    console.error('GET /api/state xato:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Inkremental sinxron: faqat `since` dan keyin o'zgargan qatorlar
app.get('/api/changes', async (req, res) => {
  try {
    const since = Number(req.query.since) || 0;
    const [ops, recs, logs, counts] = await Promise.all([
      pool.query('SELECT id, name, password, ord FROM operators WHERE updated_at > $1', [since]),
      pool.query('SELECT * FROM records WHERE updated_at > $1 LIMIT 500', [since]),
      pool.query('SELECT * FROM activity_logs WHERE created_at > $1 ORDER BY created_at DESC LIMIT 100', [since]),
      pool.query('SELECT (SELECT COUNT(*) FROM operators)::int AS op_count, (SELECT COUNT(*) FROM records)::int AS rec_count')
    ]);
    res.json({
      serverTime: Date.now(),
      operators: ops.rows,
      records: recs.rows.map(r => ({ operatorId: r.operator_id, ...recordToJs(r) })),
      logs: logs.rows.map(logToJs),
      opCount: counts.rows[0].op_count,
      recCount: counts.rows[0].rec_count
    });
  } catch (err) {
    console.error('GET /api/changes xato:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Bitta yozuvning bitta maydonini yangilash — eng tez-tez ishlatiladigan amal
app.put('/api/records/:id', async (req, res) => {
  try {
    const { field, value } = req.body || {};
    const column = FIELD_COLUMNS[field];
    if (!column) return res.status(400).json({ error: `Noma'lum maydon: ${field}` });
    await pool.query(
      `UPDATE records SET ${column} = $1, updated_at = $2 WHERE id = $3`,
      [String(value ?? ''), Date.now(), req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/records xato:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Yangi yozuv qo'shish
app.post('/api/records', async (req, res) => {
  try {
    const { operatorId, record } = req.body || {};
    if (!operatorId || !record?.id) return res.status(400).json({ error: 'operatorId va record.id shart' });
    const now = Date.now();
    await pool.query(
      `INSERT INTO records (id, operator_id, num, viloyat, fish, tugulgan_sana, tel, tel_qoshimcha, natija, izoh, sana, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         num = $3, viloyat = $4, fish = $5, tugulgan_sana = $6, tel = $7,
         tel_qoshimcha = $8, natija = $9, izoh = $10, sana = $11, updated_at = $12`,
      [
        record.id, operatorId, record.no || 0,
        record.viloyat || '', record.fish || '', record.tugulganSana || '',
        record.tel || '', record.telQoshimcha || '', record.natija || '', record.izoh || '',
        record.sana || '', now
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/records xato:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/records/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM records WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Operator yaratish / qisman yangilash (faqat berilgan maydonlar o'zgaradi)
app.post('/api/operators', async (req, res) => {
  try {
    const { id, name, password, ord } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id shart' });
    await pool.query(
      `INSERT INTO operators (id, name, password, ord, updated_at)
       VALUES ($1, COALESCE($2, 'Yangi operator'), COALESCE($3, '123456'), COALESCE($4, 999), $5)
       ON CONFLICT (id) DO UPDATE SET
         name = COALESCE($2, operators.name),
         password = COALESCE($3, operators.password),
         ord = COALESCE($4, operators.ord),
         updated_at = $5`,
      [id, name ?? null, password ?? null, ord ?? null, Date.now()]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/operators xato:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Operatorlar tartibini o'zgartirish
app.post('/api/operators/reorder', async (req, res) => {
  const client = await pool.connect();
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids massivi shart' });
    const now = Date.now();
    await client.query('BEGIN');
    for (let i = 0; i < ids.length; i++) {
      await client.query('UPDATE operators SET ord = $1, updated_at = $2 WHERE id = $3', [i, now, ids[i]]);
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/operators/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM operators WHERE id = $1', [req.params.id]); // records CASCADE bilan o'chadi
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// To'liq almashtirish — faqat admin ommaviy amallari uchun (import, tozalash, taqsimlash)
app.post('/api/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const { operators } = req.body || {};
    if (!Array.isArray(operators)) return res.status(400).json({ error: 'operators massivi shart' });
    const now = Date.now();
    await client.query('BEGIN');
    await client.query('DELETE FROM records');
    await client.query('DELETE FROM operators');
    for (let i = 0; i < operators.length; i++) {
      const op = operators[i];
      await client.query(
        'INSERT INTO operators (id, name, password, ord, updated_at) VALUES ($1,$2,$3,$4,$5)',
        [op.id, op.name || "Noma'lum operator", op.password || '123456', i, now]
      );
      if (op.records?.length) {
        await insertRecords(client, op.id, op.records, now);
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /api/bulk xato:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Ish jurnali yozuvi
app.post('/api/logs', async (req, res) => {
  try {
    const l = req.body || {};
    if (!l.id) return res.status(400).json({ error: 'id shart' });
    await pool.query(
      `INSERT INTO activity_logs (id, operator_id, operator_name, school_name, field, old_value, new_value, ts, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [l.id, l.operatorId || '', l.operatorName || '', l.schoolName || '', l.field || '', l.oldValue || '', l.newValue || '', l.timestamp || '', Date.now()]
    );
    // Vaqti-vaqti bilan eski jurnallarni tozalash (1000 tadan ortig'i)
    if (Math.random() < 0.02) {
      await pool.query(
        `DELETE FROM activity_logs WHERE id NOT IN (SELECT id FROM activity_logs ORDER BY created_at DESC LIMIT 1000)`
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Chat: ?after=<id> berilsa faqat undan keyingilar, bo'lmasa oxirgi 120 ta
app.get('/api/messages', async (req, res) => {
  try {
    const after = String(req.query.after || '');
    let rows;
    if (after) {
      rows = (await pool.query('SELECT * FROM messages WHERE id > $1 ORDER BY id ASC LIMIT 200', [after])).rows;
    } else {
      rows = (await pool.query('SELECT * FROM messages ORDER BY id DESC LIMIT 120')).rows.reverse();
    }
    res.json(rows.map(messageToJs));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const m = req.body || {};
    if (!m.id) return res.status(400).json({ error: 'id shart' });
    await pool.query(
      `INSERT INTO messages (id, sender_id, sender_name, text, ts, is_announcement, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [m.id, m.senderId || '', m.senderName || '', m.text || '', m.timestamp || '', !!m.isAnnouncement, Date.now()]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/messages', async (_req, res) => {
  try {
    await pool.query('DELETE FROM messages');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Build qilingan frontend mavjud bo'lsa - statik xizmat (production rejim)
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 8787;

initSchema()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Neon Postgres API server ishga tushdi: http://localhost:${PORT}`);
      console.log(fs.existsSync(distDir)
        ? `   Frontend ham shu manzilda: http://localhost:${PORT}`
        : `   Dev rejim: alohida 'npm run dev' ishga tushiring (vite /api ni proxy qiladi)`);
    });
  })
  .catch(err => {
    console.error('❌ Neon bazasiga ulanib bo\'lmadi:', err.message);
    process.exit(1);
  });
