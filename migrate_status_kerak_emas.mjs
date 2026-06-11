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

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('Fetching operators for migration...');
  const querySnapshot = await getDocs(collection(db, 'operators'));
  
  let migratedCount = 0;

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    const records = data.records || [];
    let updated = false;

    const newRecords = records.map(r => {
      if (r.natija === 'Kerak emas') {
        migratedCount++;
        updated = true;
        return { ...r, natija: "O'qimaydi" };
      }
      return r;
    });

    if (updated) {
      console.log(`Migrating records for operator: ${data.name}...`);
      await setDoc(doc(db, 'operators', docSnap.id), {
        ...data,
        records: newRecords
      });
    }
  }

  console.log(`\n🎉 Migration complete! Jami ${migratedCount} ta yozuv "Kerak emas" dan "O'qimaydi" ga o'zgartirildi.`);
}

main().catch(console.error);
