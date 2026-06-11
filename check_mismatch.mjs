import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

  const snapshot = await getDocs(collection(db, 'operators'));
  
  let mismatchFound = false;
  const mismatchLog = [];

  snapshot.docs.forEach(docSnap => {
    const opId = docSnap.id;
    const data = docSnap.data();
    const records = data.records || [];
    
    records.forEach(r => {
      // Record ID format: {operatorId}_{recordNo}_{timestamp}
      if (r.id) {
        const parts = r.id.split('_');
        const recordOpId = parts[0];
        
        // Check if this record's "owner" ID (from the ID field) matches the document it's stored in
        if (recordOpId !== opId) {
          mismatchFound = true;
          const touched = (r.natija && r.natija !== '') || (r.izoh && r.izoh !== '');
          mismatchLog.push({
            currentDoc: opId,
            currentDocName: data.name,
            recordId: r.id,
            originalOpId: recordOpId,
            fish: r.fish,
            tel: r.tel,
            natija: r.natija,
            izoh: r.izoh,
            isTouched: touched
          });
        }
      }
    });
  });

  if (!mismatchFound) {
    console.log("✅ Hamma yozuvlar to'g'ri operatorlarda - aralashma yo'q!");
  } else {
    console.log(`❌ ARALASHMA TOPILDI! ${mismatchLog.length} ta yozuv noto'g'ri operatorda:\n`);
    
    // Group by current doc
    const byDoc = {};
    mismatchLog.forEach(m => {
      if (!byDoc[m.currentDocName]) byDoc[m.currentDocName] = [];
      byDoc[m.currentDocName].push(m);
    });

    Object.entries(byDoc).forEach(([docName, records]) => {
      const touched = records.filter(r => r.isTouched);
      console.log(`\n[${docName}] - ${records.length} ta begona yozuv (${touched.length} ta ishlangan):`);
      touched.forEach(r => {
        console.log(`  - ID: ${r.recordId}, Fish: ${r.fish}, Natija: ${r.natija}, Izoh: ${r.izoh}`);
      });
    });
  }
}

main().catch(console.error);
