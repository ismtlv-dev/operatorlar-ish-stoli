import express from "express";
import path from "path";
import pg from "pg";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));

const PORT = 3000;
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("WARNING: DATABASE_URL is not set in environment variables!");
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: dbUrl && dbUrl.includes("localhost") ? false : { rejectUnauthorized: false }
});

// Local JSON File Database Fallback
const LOCAL_DB_PATH = path.join(process.cwd(), "local_db.json");
const LocalDb = {
  getRawData() {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      const initialOperatorsList = [
        { id: '1', name: 'Kozimova Roziyabonu', password: '123456' },
        { id: '2', name: 'Yakubova Feruza', password: '123456' },
        { id: '3', name: 'Qosimova Elnura', password: '123456' },
        { id: '4', name: 'Bafoyeva Solihabegim', password: '123456' },
        { id: '5', name: 'Abdullayeva Gulnoza', password: '123456' },
        { id: '6', name: 'Radjabova Sharabonu', password: '123456' },
        { id: '7', name: 'Igamnazarova Zebo', password: '123456' },
        { id: '8', name: 'Atabayeva Shaxnoza', password: '123456' },
        { id: '10', name: 'Ravshanova Asal', password: '123456' },
        { id: '11', name: 'HAYDAROVA SHAXINABONU ISTAMOVNA', password: '123456' },
        { id: '12', name: 'ODILOVA GULNOZA OYBEK QIZI', password: '123456' },
        { id: '13', name: 'RAXIMOVA ZULAYXO LUQMONOVNA', password: '123456' },
        { id: '14', name: 'ERGASHEVA MARJONA SHAXOBIDDIN QIZI', password: '123456' },
        { id: '15', name: 'ESANKULOVA DIYORA ZAVKIBOY QIZI', password: '123456' },
        { id: '16', name: 'HAYDAROVA GULRUH RUSTAMOVNA', password: '123456' }
      ];
      const initialData = {
        operators: initialOperatorsList,
        school_records: [],
        activity_logs: [],
        call_history: [],
        chat_messages: []
      };
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initialData, null, 2), "utf8");
      return initialData;
    }
    try {
      const content = fs.readFileSync(LOCAL_DB_PATH, "utf8");
      return JSON.parse(content);
    } catch (err) {
      console.error("Error reading local DB, resetting to defaults...", err);
      return {
        operators: [],
        school_records: [],
        activity_logs: [],
        call_history: [],
        chat_messages: []
      };
    }
  },

  saveRawData(data: any) {
    try {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
      console.error("Error writing to local DB file:", err);
    }
  }
};

let useLocalFallback = false;

// Test connection and auto-create tables
async function initDatabase() {
  if (!dbUrl) {
    console.warn("No DATABASE_URL set. Switching to local JSON fallback database (local_db.json).");
    useLocalFallback = true;
    LocalDb.getRawData(); // initial creation
    return;
  }

  try {
    const client = await pool.connect();
    console.log("Connected to Neon PostgreSQL database successfully.");
    
    // Create Operators Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS operators (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password TEXT DEFAULT '123456'
      );
    `);

    // Create School Records Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_records (
        id TEXT PRIMARY KEY,
        no INTEGER NOT NULL,
        viloyat TEXT NOT NULL,
        fish TEXT NOT NULL,
        tugulgan_sana TEXT NOT NULL,
        tel TEXT NOT NULL,
        tel_qoshimcha TEXT NOT NULL,
        natija TEXT DEFAULT '',
        izoh TEXT DEFAULT '',
        sana TEXT DEFAULT '',
        operator_id TEXT REFERENCES operators(id) ON DELETE CASCADE
      );
    `);

    // Add eslatma_vaqti and eslatma_matni columns support dynamically
    await client.query("ALTER TABLE school_records ADD COLUMN IF NOT EXISTS eslatma_vaqti TEXT DEFAULT ''");
    await client.query("ALTER TABLE school_records ADD COLUMN IF NOT EXISTS eslatma_matni TEXT DEFAULT ''");

    // Create Activity Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        operator_id TEXT NOT NULL,
        operator_name TEXT NOT NULL,
        school_name TEXT NOT NULL,
        field TEXT NOT NULL,
        old_value TEXT NOT NULL,
        new_value TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
    `);

    // Create Call History Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS call_history (
        id TEXT PRIMARY KEY,
        operator_id TEXT NOT NULL,
        operator_name TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_tel TEXT NOT NULL,
        client_viloyat TEXT NOT NULL,
        status TEXT NOT NULL,
        izoh TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        date TEXT NOT NULL
      );
    `);

    // Create Chat Messages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        is_announcement BOOLEAN DEFAULT FALSE
      );
    `);

    // Seed Operators if table is completely empty
    const checkOps = await client.query("SELECT COUNT(*) FROM operators");
    if (parseInt(checkOps.rows[0].count) === 0) {
      console.log("Seeding initial operators into the database...");
      const initialOperators = [
        { id: '1', name: 'Kozimova Roziyabonu', password: '123456' },
        { id: '2', name: 'Yakubova Feruza', password: '123456' },
        { id: '3', name: 'Qosimova Elnura', password: '123456' },
        { id: '4', name: 'Bafoyeva Solihabegim', password: '123456' },
        { id: '5', name: 'Abdullayeva Gulnoza', password: '123456' },
        { id: '6', name: 'Radjabova Sharabonu', password: '123456' },
        { id: '7', name: 'Igamnazarova Zebo', password: '123456' },
        { id: '8', name: 'Atabayeva Shaxnoza', password: '123456' },
        { id: '10', name: 'Ravshanova Asal', password: '123456' },
        { id: '11', name: 'HAYDAROVA SHAXINABONU ISTAMOVNA', password: '123456' },
        { id: '12', name: 'ODILOVA GULNOZA OYBEK QIZI', password: '123456' },
        { id: '13', name: 'RAXIMOVA ZULAYXO LUQMONOVNA', password: '123456' },
        { id: '14', name: 'ERGASHEVA MARJONA SHAXOBIDDIN QIZI', password: '123456' },
        { id: '15', name: 'ESANKULOVA DIYORA ZAVKIBOY QIZI', password: '123456' },
        { id: '16', name: 'HAYDAROVA GULRUH RUSTAMOVNA', password: '123456' }
      ];

      for (const op of initialOperators) {
        await client.query(
          "INSERT INTO operators (id, name, password) VALUES ($1, $2, $3)",
          [op.id, op.name, op.password]
        );
      }
      console.log("Seeding complete!");
    }

    client.release();
  } catch (err: any) {
    console.error("PostgreSQL connection failed:", err.message);
    console.warn("Switching to local JSON fallback database (local_db.json) dynamically.");
    useLocalFallback = true;
    LocalDb.getRawData();
  }
}

initDatabase();

// API Endpoints
// Load all operators and their school records
app.get("/api/operators", async (req, res) => {
  try {
    if (useLocalFallback) {
      const data = LocalDb.getRawData();
      const operators = (data.operators || []).map((op: any) => {
        const records = (data.school_records || [])
          .filter((r: any) => r.operator_id === op.id)
          .map((r: any) => ({
            id: r.id,
            no: Number(r.no),
            viloyat: r.viloyat,
            fish: r.fish,
            tugulganSana: r.tugulgan_sana,
            tel: r.tel,
            telQoshimcha: r.tel_qoshimcha,
            natija: r.natija,
            izoh: r.izoh,
            sana: r.sana,
            eslatmaVaqti: r.eslatma_vaqti || '',
            eslatmaMatni: r.eslatma_matni || ''
          }));
        
        // Sort records by `no` ascending like postgres does
        records.sort((a: any, b: any) => (a.no || 0) - (b.no || 0));

        return {
          id: op.id,
          name: op.name,
          password: op.password,
          records
        };
      });

      // Sort operators by numeric representation of id ASC like bigint order
      operators.sort((a: any, b: any) => {
        return parseInt(a.id || '0', 10) - parseInt(b.id || '0', 10);
      });

      return res.json({ success: true, operators });
    }

    const opsResult = await pool.query("SELECT * FROM operators ORDER BY id::bigint ASC");
    const recordsResult = await pool.query("SELECT * FROM school_records ORDER BY no ASC");
    
    // Group records by operator_id
    const operators = opsResult.rows.map(op => {
      const records = recordsResult.rows
        .filter(r => r.operator_id === op.id)
        .map(r => ({
          id: r.id,
          no: r.no,
          viloyat: r.viloyat,
          fish: r.fish,
          tugulganSana: r.tugulgan_sana,
          tel: r.tel,
          telQoshimcha: r.tel_qoshimcha,
          natija: r.natija,
          izoh: r.izoh,
          sana: r.sana,
          eslatmaVaqti: r.eslatma_vaqti || '',
          eslatmaMatni: r.eslatma_matni || ''
        }));
      return {
        id: op.id,
        name: op.name,
        password: op.password,
        records
      };
    });

    res.json({ success: true, operators });
  } catch (err: any) {
    console.error("GET /api/operators failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save or update an operator's full record state
app.post("/api/save-operators", async (req, res) => {
  try {
    const { operators } = req.body;
    if (!Array.isArray(operators)) {
      return res.status(400).json({ success: false, error: "Invalid operators payload" });
    }

    if (useLocalFallback) {
      const data = LocalDb.getRawData();
      for (const op of operators) {
        // Upsert operator
        const existingOpIdx = (data.operators || []).findIndex((o: any) => o.id === op.id);
        const opToUpsert = {
          id: op.id,
          name: op.name,
          password: op.password || '123456'
        };
        if (existingOpIdx >= 0) {
          data.operators[existingOpIdx] = opToUpsert;
        } else {
          data.operators.push(opToUpsert);
        }

        if (Array.isArray(op.records)) {
          for (const rec of op.records) {
            const existingRecIdx = (data.school_records || []).findIndex((r: any) => r.id === rec.id);
            const recToUpsert = {
              id: rec.id,
              no: Number(rec.no),
              viloyat: rec.viloyat,
              fish: rec.fish,
              tugulgan_sana: rec.tugulganSana,
              tel: rec.tel,
              tel_qoshimcha: rec.telQoshimcha,
              natija: rec.natija || '',
              izoh: rec.izoh || '',
              sana: rec.sana || '',
              operator_id: op.id,
              eslatma_vaqti: rec.eslatmaVaqti || '',
              eslatma_matni: rec.eslatmaMatni || ''
            };
            if (existingRecIdx >= 0) {
              data.school_records[existingRecIdx] = recToUpsert;
            } else {
              data.school_records.push(recToUpsert);
            }
          }
        }
      }
      LocalDb.saveRawData(data);
      return res.json({ success: true });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      for (const op of operators) {
        // Upsert operator
        await client.query(
          `INSERT INTO operators (id, name, password) VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password`,
          [op.id, op.name, op.password || '123456']
        );

        if (Array.isArray(op.records)) {
          for (const rec of op.records) {
            await client.query(
              `INSERT INTO school_records (id, no, viloyat, fish, tugulgan_sana, tel, tel_qoshimcha, natija, izoh, sana, operator_id, eslatma_vaqti, eslatma_matni) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
               ON CONFLICT (id) DO UPDATE SET 
                  no = EXCLUDED.no,
                  viloyat = EXCLUDED.viloyat,
                  fish = EXCLUDED.fish,
                  tugulgan_sana = EXCLUDED.tugulgan_sana,
                  tel = EXCLUDED.tel,
                  tel_qoshimcha = EXCLUDED.tel_qoshimcha,
                  natija = EXCLUDED.natija,
                  izoh = EXCLUDED.izoh,
                  sana = EXCLUDED.sana,
                  operator_id = EXCLUDED.operator_id,
                  eslatma_vaqti = EXCLUDED.eslatma_vaqti,
                  eslatma_matni = EXCLUDED.eslatma_matni`,
              [
                rec.id, 
                rec.no, 
                rec.viloyat, 
                rec.fish, 
                rec.tugulganSana, 
                rec.tel, 
                rec.telQoshimcha, 
                rec.natija || '', 
                rec.izoh || '', 
                rec.sana || '',
                op.id,
                rec.eslatmaVaqti || '',
                rec.eslatmaMatni || ''
              ]
            );
          }
        }
      }

      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("POST /api/save-operators failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save single record update directly (highly optimized with direct history logging)
app.post("/api/update-record", async (req, res) => {
  try {
    const { operatorId, recordId, field, value } = req.body;
    let dbField = field;
    if (field === 'tugulganSana') dbField = 'tugulgan_sana';
    if (field === 'telQoshimcha') dbField = 'tel_qoshimcha';
    if (field === 'eslatmaVaqti') dbField = 'eslatma_vaqti';
    if (field === 'eslatmaMatni') dbField = 'eslatma_matni';

    const validFields = ['no', 'viloyat', 'fish', 'tugulgan_sana', 'tel', 'tel_qoshimcha', 'natija', 'izoh', 'sana', 'operator_id', 'eslatma_vaqti', 'eslatma_matni'];
    if (!validFields.includes(dbField)) {
      return res.status(400).json({ success: false, error: "Invalid field name" });
    }

    if (useLocalFallback) {
      const data = LocalDb.getRawData();
      const rec = (data.school_records || []).find((r: any) => r.id === recordId);
      if (!rec) {
        return res.status(404).json({ success: false, error: "Record not found" });
      }

      const op = (data.operators || []).find((o: any) => o.id === operatorId);
      const opName = op ? op.name : "Noma'lum Operator";
      const oldValue = rec[dbField] || '';

      // Update main record
      rec[dbField] = value;
      rec.operator_id = operatorId;

      const now = new Date();
      const dStr = new Intl.DateTimeFormat('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(now);
      const tStr = new Intl.DateTimeFormat('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);
      const formattedTimestamp = `${dStr} ${tStr}`;

      // Also update sana (date) when modifying natija (result)
      if (field === 'natija') {
        rec.sana = dStr;
      }

      // If natija or izoh is modified, write to call_history
      if (field === 'natija' || field === 'izoh') {
        const histId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const finalNatija = field === 'natija' ? value : (rec.natija || '');
        const finalIzoh = field === 'izoh' ? value : (rec.izoh || '');

        data.call_history.push({
          id: histId,
          operator_id: operatorId,
          operator_name: opName,
          client_name: rec.fish,
          client_tel: rec.tel,
          client_viloyat: rec.viloyat,
          status: finalNatija,
          izoh: finalIzoh,
          timestamp: formattedTimestamp,
          date: dStr
        });
      }

      // Also write to activity_logs
      const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const labelMap: Record<string, string> = {
        viloyat: 'Viloyat',
        fish: 'Familiya Ism Sharif',
        tugulganSana: 'Tugulgan sanasi',
        tel: 'Telefon raqami',
        telQoshimcha: "Qo'shimcha telefon",
        natija: 'Natija (Holat)',
        izoh: 'Izoh'
      };
      const label = labelMap[field] || field;

      data.activity_logs.push({
        id: logId,
        operator_id: operatorId,
        operator_name: opName,
        school_name: rec.fish,
        field: label,
        old_value: oldValue,
        new_value: value,
        timestamp: formattedTimestamp
      });

      LocalDb.saveRawData(data);
      return res.json({ success: true });
    }

    const currentRecordRes = await pool.query("SELECT * FROM school_records WHERE id = $1", [recordId]);
    if (currentRecordRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }
    const rec = currentRecordRes.rows[0];
    const opRes = await pool.query("SELECT name FROM operators WHERE id = $1", [operatorId]);
    const opName = opRes.rows.length > 0 ? opRes.rows[0].name : "Noma'lum Operator";
    const oldValue = rec[dbField] || '';

    // Update main record
    await pool.query(`UPDATE school_records SET ${dbField} = $1 WHERE id = $2 AND operator_id = $3`, [value, recordId, operatorId]);

    const now = new Date();
    const dStr = new Intl.DateTimeFormat('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(now);
    const tStr = new Intl.DateTimeFormat('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);
    const formattedTimestamp = `${dStr} ${tStr}`;

    // Also update sana (date) when modifying natija (result)
    if (field === 'natija') {
      await pool.query(`UPDATE school_records SET sana = $1 WHERE id = $2`, [dStr, recordId]);
    }

    // If natija or izoh is modified, write to call_history
    if (field === 'natija' || field === 'izoh') {
      const histId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const finalNatija = field === 'natija' ? value : (rec.natija || '');
      const finalIzoh = field === 'izoh' ? value : (rec.izoh || '');
      
      await pool.query(
        `INSERT INTO call_history (id, operator_id, operator_name, client_name, client_tel, client_viloyat, status, izoh, timestamp, date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [histId, operatorId, opName, rec.fish, rec.tel, rec.viloyat, finalNatija, finalIzoh, formattedTimestamp, dStr]
      );
    }

    // Also write to activity_logs
    const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const labelMap: Record<string, string> = {
      viloyat: 'Viloyat',
      fish: 'Familiya Ism Sharif',
      tugulganSana: 'Tugulgan sanasi',
      tel: 'Telefon raqami',
      telQoshimcha: "Qo'shimcha telefon",
      natija: 'Natija (Holat)',
      izoh: 'Izoh'
    };
    const label = labelMap[field] || field;

    await pool.query(
      `INSERT INTO activity_logs (id, operator_id, operator_name, school_name, field, old_value, new_value, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [logId, operatorId, opName, rec.fish, label, oldValue, value, formattedTimestamp]
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/update-record failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Operator changing their own password
app.post("/api/change-password", async (req, res) => {
  try {
    const { operatorId, currentPassword, newPassword } = req.body;
    if (!operatorId || !newPassword) {
      return res.status(400).json({ success: false, error: "Tizim xatosi: Ma'lumot yetarli emas" });
    }
    
    if (useLocalFallback) {
      const data = LocalDb.getRawData();
      const op = (data.operators || []).find((o: any) => o.id === operatorId);
      if (!op) {
        return res.status(404).json({ success: false, error: "Operator topilmadi" });
      }

      const currentPassToCheck = currentPassword || '';
      if (currentPassToCheck && op.password !== currentPassToCheck) {
        return res.status(400).json({ success: false, error: "Hozirgi parolingiz noto'g'ri kiritildi!" });
      }

      op.password = newPassword;
      LocalDb.saveRawData(data);
      return res.json({ success: true });
    }

    const opResult = await pool.query("SELECT password FROM operators WHERE id = $1", [operatorId]);
    if (opResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Operator topilmadi" });
    }
    
    if (currentPassword && opResult.rows[0].password !== currentPassword) {
      return res.status(400).json({ success: false, error: "Hozirgi parolingiz noto'g'ri kiritildi!" });
    }

    await pool.query("UPDATE operators SET password = $1 WHERE id = $2", [newPassword, operatorId]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/change-password failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Redistribution / Reset endpoint
app.post("/api/reset-records", async (req, res) => {
  try {
    if (useLocalFallback) {
      const data = LocalDb.getRawData();
      data.school_records = [];
      data.activity_logs = [];
      data.call_history = [];
      data.chat_messages = [];
      LocalDb.saveRawData(data);
      return res.json({ success: true });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM school_records");
      await client.query("DELETE FROM activity_logs");
      await client.query("DELETE FROM call_history");
      await client.query("DELETE FROM chat_messages");
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("POST /api/reset-records failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Activity logs
app.get("/api/logs", async (req, res) => {
  try {
    if (useLocalFallback) {
      const data = LocalDb.getRawData();
      // sort logs to return newest first (descending by id / position)
      const rawLogs = [...(data.activity_logs || [])].reverse().slice(0, 500);
      const logs = rawLogs.map((r: any) => ({
        id: r.id,
        operatorId: r.operator_id,
        operatorName: r.operator_name,
        schoolName: r.school_name,
        field: r.field,
        oldValue: r.old_value,
        newValue: r.new_value,
        timestamp: r.timestamp
      }));
      return res.json({ success: true, logs });
    }

    const result = await pool.query("SELECT * FROM activity_logs ORDER BY id DESC LIMIT 500");
    const logs = result.rows.map(r => ({
      id: r.id,
      operatorId: r.operator_id,
      operatorName: r.operator_name,
      schoolName: r.school_name,
      field: r.field,
      oldValue: r.old_value,
      newValue: r.new_value,
      timestamp: r.timestamp
    }));
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/logs", async (req, res) => {
  try {
    const { logs } = req.body;
    if (!Array.isArray(logs)) return res.status(400).json({ success: false });

    if (useLocalFallback) {
      const data = LocalDb.getRawData();
      for (const log of logs) {
        if (!data.activity_logs.some((l: any) => l.id === log.id)) {
          data.activity_logs.push({
            id: log.id,
            operator_id: log.operatorId,
            operator_name: log.operatorName,
            school_name: log.schoolName,
            field: log.field,
            old_value: log.oldValue,
            new_value: log.newValue,
            timestamp: log.timestamp
          });
        }
      }
      LocalDb.saveRawData(data);
      return res.json({ success: true });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const log of logs) {
        await client.query(
          `INSERT INTO activity_logs (id, operator_id, operator_name, school_name, field, old_value, new_value, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [log.id, log.operatorId, log.operatorName, log.schoolName, log.field, log.oldValue, log.newValue, log.timestamp]
        );
      }
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Call history entries
app.get("/api/history", async (req, res) => {
  try {
    if (useLocalFallback) {
      const data = LocalDb.getRawData();
      const rawHistory = [...(data.call_history || [])].reverse().slice(0, 2000);
      const history = rawHistory.map((r: any) => ({
        id: r.id,
        operatorId: r.operator_id,
        operatorName: r.operator_name,
        clientName: r.client_name,
        clientTel: r.client_tel,
        clientViloyat: r.client_viloyat,
        status: r.status,
        izoh: r.izoh,
        timestamp: r.timestamp,
        date: r.date
      }));
      return res.json({ success: true, history });
    }

    const result = await pool.query("SELECT * FROM call_history ORDER BY timestamp DESC LIMIT 2000");
    const history = result.rows.map(r => ({
      id: r.id,
      operatorId: r.operator_id,
      operatorName: r.operator_name,
      clientName: r.client_name,
      clientTel: r.client_tel,
      clientViloyat: r.client_viloyat,
      status: r.status,
      izoh: r.izoh,
      timestamp: r.timestamp,
      date: r.date
    }));
    res.json({ success: true, history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/history", async (req, res) => {
  try {
    const { history } = req.body;
    if (!Array.isArray(history)) return res.status(400).json({ success: false });

    if (useLocalFallback) {
      const data = LocalDb.getRawData();
      for (const ent of history) {
        if (!data.call_history.some((h: any) => h.id === ent.id)) {
          data.call_history.push({
            id: ent.id,
            operator_id: ent.operatorId,
            operator_name: ent.operatorName,
            client_name: ent.clientName,
            client_tel: ent.clientTel,
            client_viloyat: ent.clientViloyat,
            status: ent.status,
            izoh: ent.izoh,
            timestamp: ent.timestamp,
            date: ent.date
          });
        }
      }
      LocalDb.saveRawData(data);
      return res.json({ success: true });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const ent of history) {
        await client.query(
          `INSERT INTO call_history (id, operator_id, operator_name, client_name, client_tel, client_viloyat, status, izoh, timestamp, date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [ent.id, ent.operatorId, ent.operatorName, ent.clientName, ent.clientTel, ent.clientViloyat, ent.status, ent.izoh, ent.timestamp, ent.date]
        );
      }
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Chat messages
app.get("/api/messages", async (req, res) => {
  try {
    if (useLocalFallback) {
      const data = LocalDb.getRawData();
      const rawMessages = (data.chat_messages || []).slice(0, 500);
      const messages = rawMessages.map((r: any) => ({
        id: r.id,
        senderId: r.sender_id,
        senderName: r.sender_name,
        text: r.text,
        timestamp: r.timestamp,
        isAnnouncement: r.is_announcement
      }));
      return res.json({ success: true, messages });
    }

    const result = await pool.query("SELECT * FROM chat_messages ORDER BY timestamp ASC LIMIT 500");
    const messages = result.rows.map(r => ({
      id: r.id,
      senderId: r.sender_id,
      senderName: r.sender_name,
      text: r.text,
      timestamp: r.timestamp,
      isAnnouncement: r.is_announcement
    }));
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) return res.status(400).json({ success: false });

    if (useLocalFallback) {
      const data = LocalDb.getRawData();
      for (const msg of messages) {
        if (!data.chat_messages.some((m: any) => m.id === msg.id)) {
          data.chat_messages.push({
            id: msg.id,
            sender_id: msg.senderId,
            sender_name: msg.senderName,
            text: msg.text,
            timestamp: msg.timestamp,
            is_announcement: msg.isAnnouncement || false
          });
        }
      }
      LocalDb.saveRawData(data);
      return res.json({ success: true });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const msg of messages) {
        await client.query(
          `INSERT INTO chat_messages (id, sender_id, sender_name, text, timestamp, is_announcement)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [msg.id, msg.senderId, msg.senderName, msg.text, msg.timestamp, msg.isAnnouncement || false]
        );
      }
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single chat message post
app.post("/api/send-message", async (req, res) => {
  try {
    const { id, senderId, senderName, text, timestamp, isAnnouncement } = req.body;
    if (!id || !senderId || !text) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    if (useLocalFallback) {
      const data = LocalDb.getRawData();
      if (!data.chat_messages.some((m: any) => m.id === id)) {
        data.chat_messages.push({
          id,
          sender_id: senderId,
          sender_name: senderName,
          text,
          timestamp,
          is_announcement: isAnnouncement || false
        });
        LocalDb.saveRawData(data);
      }
      return res.json({ success: true });
    }

    await pool.query(
      `INSERT INTO chat_messages (id, sender_id, sender_name, text, timestamp, is_announcement)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, senderId, senderName, text, timestamp, isAnnouncement || false]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/send-message failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear all chat messages
app.post("/api/clear-chat", async (req, res) => {
  try {
    if (useLocalFallback) {
      const data = LocalDb.getRawData();
      data.chat_messages = [];
      LocalDb.saveRawData(data);
      return res.json({ success: true });
    }

    await pool.query("DELETE FROM chat_messages");
    res.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/clear-chat failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
