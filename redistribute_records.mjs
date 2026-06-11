import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA7ns8X6jdsC5okahm2EO6LUAV1QmgEXv8",
  authDomain: "untitled-project-6a358f9fgd9t4.firebaseapp.com",
  projectId: "untitled-project-6a358f9fgd9t4",
  storageBucket: "untitled-project-6a358f9fgd9t4.firebasestorage.app",
  messagingSenderId: "705652512920",
  appId: "1:705652512920:web:535c6e17e5b869ed1358ed"
};

// DRY_RUN: true bo'lsa faqat konsolga chiqaradi, false bo'lsa Firestore'ga yozadi.
const DRY_RUN = false;

// Telefon raqamini normallashtirish
function normalizeTel(raw) {
  let t = String(raw || '').replace(/[^0-9]/g, '').trim();
  if (!t) return '';
  if (t.length === 9) t = '998' + t;
  if (t.length === 10 && t.startsWith('0')) t = '998' + t.slice(1);
  return t;
}

// UUID generator
function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('1. Fetching operators from Firestore...');
  const querySnapshot = await getDocs(collection(db, 'operators'));
  
  const operators = [];
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    operators.push({
      id: docSnap.id,
      name: data.name,
      password: data.password || '123456',
      order: data.order ?? 999,
      records: data.records || []
    });
  });

  // Tartib bo'yicha saralash
  operators.sort((a, b) => a.order - b.order);
  console.log(`Bazada jami ${operators.length} ta operator aniqlandi.`);

  // 2. Chaqirilgan (touched) va chaqirilmagan (untouched) yozuvlarni ajratish
  const touchedPhones = new Set();
  const allTouchedRecordsMap = {}; // operatorId -> touched records list
  const globalUntouchedPool = [];

  operators.forEach(op => {
    allTouchedRecordsMap[op.id] = [];
    op.records.forEach(r => {
      const isTouched = (r.natija && r.natija.trim()) || 
                        (r.izoh && r.izoh.trim()) || 
                        (r.telQoshimcha && r.telQoshimcha.trim());
      
      const normalizedPhone = normalizeTel(r.tel);
      if (isTouched) {
        allTouchedRecordsMap[op.id].push(r);
        if (normalizedPhone) {
          touchedPhones.add(normalizedPhone);
        }
      } else {
        globalUntouchedPool.push(r);
      }
    });
  });

  const totalTouchedCount = Object.values(allTouchedRecordsMap).reduce((sum, list) => sum + list.length, 0);
  console.log(`Chaqirilgan (touched) yozuvlar soni: ${totalTouchedCount}`);
  console.log(`Chaqirilmagan (untouched) yozuvlar soni: ${globalUntouchedPool.length}`);

  // Chaqirilmagan yozuvlar ichida chaqirilgan raqamlar bilan mos keladiganlarini tozalash (xavfsizlik uchun)
  const cleanUntouchedPool = [];
  const seenPoolPhones = new Set();

  globalUntouchedPool.forEach(r => {
    const normalizedPhone = normalizeTel(r.tel);
    if (!normalizedPhone) return;
    if (touchedPhones.has(normalizedPhone)) {
      console.log(`⚠️  Ogohlantirish: Chaqirilgan raqam pool ichida topildi va olib tashlandi: ${r.fish} (${r.tel})`);
      return;
    }
    if (seenPoolPhones.has(normalizedPhone)) {
      // Pool ichidagi dublikat raqamlarni olib tashlaymiz
      return;
    }
    seenPoolPhones.add(normalizedPhone);
    cleanUntouchedPool.push(r);
  });

  console.log(`Tozalangan unikal chaqirilmagan yozuvlar soni: ${cleanUntouchedPool.length}`);
  const totalUniqueRecords = totalTouchedCount + cleanUntouchedPool.length;
  console.log(`Jami unikal yozuvlar soni (Baza uchun): ${totalUniqueRecords}`);

  // 3. Har bir operator uchun target yozuvlar sonini aniqlash (Variant 1: Teng taqsimlash)
  const N = operators.length;
  const baseCount = Math.floor(totalUniqueRecords / N);
  const remainder = totalUniqueRecords % N;

  const targetSizes = {};
  operators.forEach((op, idx) => {
    // Masalan, 1410 / 16 = 88, qoldiq 10. Dastlabki 10 ta operator 89 ta, qolgan 6 tasi 88 ta oladi.
    targetSizes[op.id] = baseCount + (idx < remainder ? 1 : 0);
  });

  console.log('\nOperatorlarning maqsadli yozuvlar soni (Teng taqsimot bo\'yicha):');
  operators.forEach(op => {
    console.log(`   ${op.name}: ${targetSizes[op.id]} ta (Chaqirilgan: ${allTouchedRecordsMap[op.id].length} ta)`);
  });

  // 4. Qayta taqsimlash
  const newOperatorRecords = {};
  let poolIndex = 0;

  operators.forEach(op => {
    // Avval chaqirilganlarni joylashtiramiz
    const opRecords = [...allTouchedRecordsMap[op.id]];
    const targetSize = targetSizes[op.id];

    // Chaqirilganlar soni targetSize dan ko'p bo'lishi mumkin emas (bizda max 22 ta, target 88)
    if (opRecords.length > targetSize) {
      throw new Error(`Xatolik: Operator ${op.name} uchun chaqirilgan yozuvlar (${opRecords.length}) target sonidan (${targetSize}) ko'p!`);
    }

    // Yetmagan joyini tozalangan pool'dan to'ldiramiz
    while (opRecords.length < targetSize && poolIndex < cleanUntouchedPool.length) {
      const nextRec = cleanUntouchedPool[poolIndex++];
      opRecords.push({
        ...nextRec,
        id: `${op.id}_${opRecords.length + 1}_${Date.now()}`,
        no: opRecords.length + 1,
        telQoshimcha: nextRec.telQoshimcha || '',
        natija: nextRec.natija || '',
        izoh: nextRec.izoh || ''
      });
    }

    newOperatorRecords[op.id] = opRecords;
  });

  // Tartib raqamlarini (no) to'g'rilash va ID'larni yangilash
  operators.forEach(op => {
    newOperatorRecords[op.id] = newOperatorRecords[op.id].map((rec, idx) => {
      return {
        ...rec,
        no: idx + 1,
        // Chaqirilgan bo'lsa ID'sini saqlab qolamiz, bo'lmasa yangi ID beramiz
        id: rec.id.startsWith(op.id) ? rec.id : `${op.id}_${idx + 1}_${Date.now()}`
      };
    });
  });

  // 5. Tekshiruvlar (Sanity Checks)
  console.log('\n--- Tekshiruvlar ---');
  let finalTotalCount = 0;
  const finalPhones = new Set();
  let duplicateAcrossOperators = false;
  const phoneToOperator = {};

  operators.forEach(op => {
    const records = newOperatorRecords[op.id];
    finalTotalCount += records.length;
    
    console.log(`   ${op.name}: ${records.length} ta yozuv (Target: ${targetSizes[op.id]})`);

    records.forEach(r => {
      const p = normalizeTel(r.tel);
      if (finalPhones.has(p)) {
        console.error(`❌ Xatolik: Telefon raqam takrorlandi: ${p} (Operatorlar: ${phoneToOperator[p]} va ${op.name})`);
        duplicateAcrossOperators = true;
      }
      finalPhones.add(p);
      phoneToOperator[p] = op.name;
    });
  });

  console.log(`\nJami yakuniy yozuvlar soni: ${finalTotalCount}`);
  console.log(`Jami unikal telefonlar soni: ${finalPhones.size}`);

  if (duplicateAcrossOperators) {
    console.error('❌ Xatolik: Operatorlararo raqam takrorlanishi aniqlandi! Baza yangilanmaydi.');
    process.exit(1);
  }

  if (finalTotalCount !== totalUniqueRecords) {
    console.error(`❌ Xatolik: Jami yozuvlar soni dastlabki unikal son bilan mos kelmadi! (Yakuniy: ${finalTotalCount}, Dastlabki: ${totalUniqueRecords})`);
    process.exit(1);
  }

  console.log('✅ Tekshiruvlar muvaffaqiyatli yakunlandi. Hech qanday takrorlanish yo\'q.');

  // 6. Firestore'ga yozish
  if (DRY_RUN) {
    console.log('\nℹ️  Script DRY_RUN rejimida ishladi. Firestore bazasiga hech narsa yozilmadi.');
    console.log('Bazada o\'zgarish qilish uchun DRY_RUN = false qilib qayta ishga tushiring.');
  } else {
    console.log('\n⬆️  Firestore ga ma\'lumotlar yozilmoqda...');
    for (const op of operators) {
      const ref = doc(db, 'operators', op.id);
      await setDoc(ref, {
        id: op.id,
        name: op.name,
        password: op.password,
        order: op.order,
        records: newOperatorRecords[op.id]
      });
      console.log(`   ✅ ${op.name} yozuvlari saqlandi.`);
    }
    console.log('\n🎉 BAZA MUVAFFAQIYATLI YANGILANDI!');
  }
}

main().catch(console.error);
