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
  
  console.log('=== ISHLANGAN YOZUVLAR (barcha operatorlar uchun) ===\n');
  
  snapshot.docs.forEach(docSnap => {
    const opId = docSnap.id;
    const data = docSnap.data();
    const records = data.records || [];
    
    const touched = records.filter(r => (r.natija && r.natija.trim() !== '') || (r.izoh && r.izoh.trim() !== ''));
    
    if (touched.length > 0) {
      console.log(`\n[${opId}] ${data.name} - ${touched.length} ishlangan yozuv:`);
      touched.forEach(r => {
        console.log(`  No.${r.no} | Fish: ${r.fish?.substring(0, 30)} | Natija: "${r.natija}" | Izoh: "${r.izoh?.substring(0, 20)}" | Record ID: ${r.id}`);
      });
    }
  });
}

main().catch(console.error);
