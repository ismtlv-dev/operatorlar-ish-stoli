import pg from 'pg';
import XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

function normalizeTel(raw) {
  let t = String(raw || '').replace(/[^0-9]/g, '').trim();
  if (!t) return '';
  if (t.length === 9) t = '998' + t;
  if (t.length === 11 && t.startsWith('8')) t = '998' + t.slice(1);
  if (t.length === 12 && t.startsWith('998')) return t;
  return t;
}

async function run() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    console.log('1. Checking operators in Postgres...');
    
    // Ensure Dilsora Kamolova (ID 9) is in the database
    console.log('Upserting Kamolova Dilsora (ID 9)...');
    await client.query(
      `INSERT INTO operators (id, name, password) VALUES ('9', 'Kamolova Dilsora', '123456')
       ON CONFLICT (id) DO UPDATE SET name = 'Kamolova Dilsora'`
    );

    // Fetch all 16 operators
    const opsRes = await client.query('SELECT * FROM operators ORDER BY id::bigint ASC');
    const operators = opsRes.rows;
    console.log(`Bazada jami operatorlar soni: ${operators.length}`);
    
    operators.forEach(op => {
      console.log(` - ID: ${op.id}, Name: ${op.name}`);
    });

    if (operators.length !== 16) {
      console.warn(`WARNING: Expected 16 operators, but found ${operators.length} in database!`);
    }

    console.log('\n2. Reading Excel file Sirdaryo_1500_jadval.xlsx...');
    const wb = XLSX.readFile('Sirdaryo_1500_jadval.xlsx');
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    const seenPhones = new Set();
    const recordsToInsert = [];

    // Parse & deduplicate
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const viloyat = String(row[1] || 'Sirdaryo viloyati').trim();
      const rawDate = String(row[2] || '').trim();
      const tel = normalizeTel(row[3]);
      const izoh = String(row[4] || '').trim();

      if (!tel || tel.length < 9) continue;
      if (seenPhones.has(tel)) continue;
      seenPhones.add(tel);

      recordsToInsert.push({
        viloyat,
        tugulganSana: rawDate,
        tel,
        izoh
      });
    }

    console.log(`\nUnikal telefon raqamlar soni: ${recordsToInsert.length}`);
    console.log(`Har bir operatorga taxminan ${Math.floor(recordsToInsert.length / operators.length)} ta yozuv taqsimlanadi.`);

    // Clean previous records
    console.log('\nClearing old school_records in Postgres database...');
    await client.query('DELETE FROM school_records');

    // Distribute
    console.log('Saving distributed records to Postgres...');
    await client.query('BEGIN');

    const opRecordsCount = {};
    operators.forEach(op => {
      opRecordsCount[op.id] = 0;
    });

    for (let i = 0; i < recordsToInsert.length; i++) {
      const rec = recordsToInsert[i];
      const op = operators[i % operators.length];
      const recordNo = ++opRecordsCount[op.id];
      // Generate unique record id: {opId}_{recordNo}_{timestamp}_{rand}
      const recordId = `${op.id}_${recordNo}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

      // Since there is no name column in Sirdaryo excel sheet, we use "Sirdaryo Bitiruvchisi {index}"
      const fishName = `Sirdaryo Bitiruvchisi ${i + 1}`;

      await client.query(
        `INSERT INTO school_records (id, no, viloyat, fish, tugulgan_sana, tel, tel_qoshimcha, natija, izoh, sana, operator_id, eslatma_vaqti, eslatma_matni)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          recordId,
          recordNo,
          rec.viloyat,
          fishName,
          rec.tugulganSana,
          rec.tel,
          '', // tel_qoshimcha
          '', // natija
          rec.izoh,
          '', // sana
          op.id,
          '', // eslatma_vaqti
          ''  // eslatma_matni
        ]
      );
    }

    await client.query('COMMIT');
    console.log('\n✅ Taqsimlash va bazaga saqlash muvaffaqiyatli yakunlandi!');

    // Show summary & sanity checks
    console.log('\n--- Yakuniy Statistika (Postgres) ---');
    let totalSaved = 0;
    const finalPhonesInDb = new Set();
    let duplicateDetected = false;

    for (const op of operators) {
      const countRes = await client.query('SELECT COUNT(*), array_agg(tel) FROM school_records WHERE operator_id = $1', [op.id]);
      const count = parseInt(countRes.rows[0].count);
      totalSaved += count;
      console.log(`   ${op.name} (ID: ${op.id}): ${count} ta yozuv taqsimlandi.`);

      const opTels = countRes.rows[0].array_agg || [];
      opTels.forEach(p => {
        if (finalPhonesInDb.has(p)) {
          duplicateDetected = true;
          console.error(`❌ XATOLIK: Telefon raqam takrorlangan: ${p}`);
        }
        finalPhonesInDb.add(p);
      });
    }

    console.log(`\nJami kiritilgan yozuvlar soni: ${totalSaved}`);
    console.log(`Jami unikal telefonlar soni: ${finalPhonesInDb.size}`);

    if (duplicateDetected) {
      console.error('❌ Xatolik: Bizada dublikat telefonlar aniqlandi!');
    } else {
      console.log('✅ Tekshiruv muvaffaqiyatli: Hech qanday dublikat telefon raqamlar uchramadi!');
    }

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error during distribution:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
