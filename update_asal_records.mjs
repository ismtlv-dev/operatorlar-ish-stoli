import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyA7ns8X6jdsC5okahm2EO6LUAV1QmgEXv8",
  authDomain: "untitled-project-6a358f9fgd9t4.firebaseapp.com",
  projectId: "untitled-project-6a358f9fgd9t4",
  storageBucket: "untitled-project-6a358f9fgd9t4.firebasestorage.app",
  messagingSenderId: "705652512920",
  appId: "1:705652512920:web:535c6e17e5b869ed1358ed"
};

function formatPhone(phoneStr) {
  if (!phoneStr) return "";
  const cleaned = phoneStr.replace(/\s+/g, '').replace(/-/g, '').trim();
  if (!cleaned || cleaned === "") return "";
  if (cleaned.length === 9) {
    return "998" + cleaned;
  }
  return cleaned;
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const docRef = doc(db, 'operators', '10');
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    console.error("Operator Asal (ID 10) not found in Firestore!");
    return;
  }

  const data = docSnap.data();
  const existingRecords = data.records || [];

  // Filter: keep only touched records (those that have either natija or izoh)
  const touchedRecords = existingRecords.filter(r => (r.natija && r.natija.trim() !== "") || (r.izoh && r.izoh.trim() !== ""));
  console.log(`Found ${touchedRecords.length} touched records for Asal.`);

  // Re-index touched records from 1 to touchedRecords.length
  const newRecordsList = touchedRecords.map((r, index) => {
    return {
      ...r,
      no: index + 1
    };
  });

  // Read CSV file
  const csvPath = 'c:/Users/user/Downloads/Telegram Desktop/operatorlar-ish-stolem/Nigora_Nardiyesna_telefon.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== "");

  // CSV format: T/r;Oquvchining FIO;Otasining telefon;Onasining telefon
  // Skip the header
  let addedCount = 0;
  const timestamp = Date.now();

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(';');
    if (parts.length < 2) continue;

    const fio = parts[1]?.trim() || "";
    const otasiningTel = formatPhone(parts[2]);
    const onasiningTel = formatPhone(parts[3]);

    if (!fio) continue;

    const nextNo = newRecordsList.length + 1;
    const newRecord = {
      id: `10_${nextNo}_${timestamp}`,
      no: nextNo,
      fish: fio,
      tel: otasiningTel,
      telQoshimcha: onasiningTel,
      natija: "",
      izoh: "",
      viloyat: "Пешку туman",
      tugulganSana: ""
    };

    newRecordsList.push(newRecord);
    addedCount++;
  }

  console.log(`Parsed ${addedCount} records from CSV.`);
  console.log(`Total records for Asal after update: ${newRecordsList.length}`);

  // Update Firestore
  console.log("Saving to Firestore...");
  await setDoc(docRef, {
    ...data,
    records: newRecordsList
  });

  console.log("Successfully updated Asal's records in Firestore! 🎉");
}

main().catch(console.error);
