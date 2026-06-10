// Excel -> Firestore uploader
// Barcha unikal telefonlarni ajratib, 15 ta operatorga teng taqsimlaydi

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA7ns8X6jdsC5okahm2EO6LUAV1QmgEXv8",
  authDomain: "untitled-project-6a358f9fgd9t4.firebaseapp.com",
  projectId: "untitled-project-6a358f9fgd9t4",
  storageBucket: "untitled-project-6a358f9fgd9t4.firebasestorage.app",
  messagingSenderId: "705652512920",
  appId: "1:705652512920:web:535c6e17e5b869ed1358ed"
};

// Operator IDs (data.ts dan)
const OPERATORS = [
  { id: '1',  name: 'Kozimova Roziyabonu' },
  { id: '2',  name: 'Yakubova Feruza' },
  { id: '3',  name: 'Qosimova Elnura' },
  { id: '4',  name: 'Bafoyeva Solihabegim' },
  { id: '5',  name: 'Abdullayeva Gulnoza' },
  { id: '6',  name: 'Radjabova Sharabonu' },
  { id: '7',  name: 'Igamnazarova Zebo' },
  { id: '8',  name: 'Atabayeva Shaxnoza' },
  { id: '10', name: 'Ravshanova Asal' },
  { id: '11', name: 'HAYDAROVA SHAXINABONU ISTAMOVNA' },
  { id: '12', name: 'ODILOVA GULNOZA OYBEK QIZI' },
  { id: '13', name: 'RAXIMOVA ZULAYXO LUQMONOVNA' },
  { id: '14', name: 'ERGASHEVA MARJONA SHAXOBIDDIN QIZI' },
  { id: '15', name: 'ESANKULOVA DIYORA ZAVKIBOY QIZI' },
  { id: '16', name: 'HAYDAROVA GULRUH RUSTAMOVNA' },
];

// Excel serial sanani YYYY-MM-DD ga o'zgartirish
function excelDateToStr(serial) {
  if (!serial || isNaN(Number(serial))) return String(serial || '').trim();
  const d = new Date(Math.round((Number(serial) - 25569) * 86400 * 1000));
  return d.toISOString().slice(0, 10);
}

// Telefon raqamini normallashtirish
function normalizeTel(raw) {
  let t = String(raw || '').replace(/[^0-9]/g, '').trim();
  if (!t) return '';
  if (t.length === 9) t = '998' + t;   // 9x xxxxxxx -> 998 9x xxxxxxx
  if (t.length === 10 && t.startsWith('0')) t = '998' + t.slice(1);
  return t;
}

// UUID generator (sodda)
function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

async function main() {
  console.log('📂 Excel fayl o\'qilmoqda...');
  
  const wb = XLSX.readFile('Пешку_Вилоят_ММТБ_битирувчилар_04_06_2026_йил.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  console.log(`📊 Jami qatorlar: ${data.length}`);

  // Parse & deduplicate
  const seenPhones = new Set();
  const newRecords = [];

  for (let i = 5; i < data.length; i++) {
    const row = data[i];
    const fish    = String(row[4] || '').trim().replace(/\s+/g, ' ');
    const viloyat = String(row[2] || '').trim();
    const rawDate = row[5];
    const tel     = normalizeTel(row[6]);

    if (!fish || !tel || tel.length < 9) continue;   // bo'sh qatorlar
    if (seenPhones.has(tel)) continue;                 // takroriy
    seenPhones.add(tel);

    newRecords.push({
      id: uuid(),
      no: newRecords.length + 1,
      viloyat,
      fish,
      tugulganSana: excelDateToStr(rawDate),
      tel,
      telQoshimcha: '',
      natija: '',
      izoh: '',
    });
  }

  console.log(`✅ Unikal yozuvlar: ${newRecords.length}`);
  console.log(`👥 Operatorlar soni: ${OPERATORS.length}`);

  // Firebase init
  const app = initializeApp(firebaseConfig);
  const db  = getFirestore(app);

  // Har bir operator uchun mavjud yozuvlarni Firestore dan olish
  console.log('\n⬇️  Firestore dan mavjud ma\'lumotlar yuklanmoqda...');
  const operatorDocs = {};
  const existingPhones = new Set();

  for (const op of OPERATORS) {
    const ref  = doc(db, 'operators', op.id);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? (snap.data().records || []) : [];
    operatorDocs[op.id] = existing;
    existing.forEach(r => {
      if (r.tel) existingPhones.add(normalizeTel(r.tel));
    });
    console.log(`   ${op.name}: ${existing.length} ta mavjud yozuv`);
  }

  console.log(`\n🔍 Bazada allaqachon mavjud telefonlar: ${existingPhones.size}`);

  // Bazada yo'q yangi yozuvlarni filtr
  const toDistribute = newRecords.filter(r => !existingPhones.has(r.tel));
  console.log(`📋 Yangi taqsimlanishi kerak: ${toDistribute.length} ta`);

  if (toDistribute.length === 0) {
    console.log('⚠️  Barcha yozuvlar allaqachon bazada mavjud!');
    process.exit(0);
  }

  // Operatorlarga teng taqsimlash (round-robin)
  let opIdx = 0;
  let counter = 0;
  for (const rec of toDistribute) {
    const op = OPERATORS[opIdx % OPERATORS.length];
    operatorDocs[op.id].push({ ...rec, no: operatorDocs[op.id].length + 1, id: uuid() });
    opIdx++;
    counter++;
  }

  // Firestore ga yozish
  console.log('\n⬆️  Firestore ga yuklanmoqda...');
  for (const op of OPERATORS) {
    const ref = doc(db, 'operators', op.id);
    await setDoc(ref, {
      id: op.id,
      name: op.name,
      password: '123456',
      records: operatorDocs[op.id],
    });
    console.log(`   ✅ ${op.name}: ${operatorDocs[op.id].length} ta yozuv saqlandi`);
  }

  console.log(`\n🎉 TAYYOR! Jami ${counter} ta yangi yozuv ${OPERATORS.length} ta operatorga taqsimlandi.`);
  console.log(`📌 Har bir operatorda taxminan ${Math.ceil(counter / OPERATORS.length)} ta yangi yozuv qo'shildi.`);
  process.exit(0);
}

main().catch(e => { console.error('❌ Xato:', e.message); process.exit(1); });
