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
  
  console.log(`\n=== BARCHA OPERATORLAR HOLATI ===`);
  console.log(`Jami operator: ${snapshot.docs.length}\n`);
  
  const operators = [];
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const records = data.records || [];
    const touched = records.filter(r => (r.natija && r.natija.trim() !== '') || (r.izoh && r.izoh.trim() !== ''));
    operators.push({
      id: doc.id,
      name: data.name,
      total: records.length,
      touched: touched.length
    });
  });
  
  // Sort by ID
  operators.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  
  operators.forEach(op => {
    console.log(`[${op.id}] ${op.name}: ${op.total} ta yozuv (${op.touched} ta ishlangan)`);
  });
  
  const totalRecords = operators.reduce((sum, op) => sum + op.total, 0);
  console.log(`\nJAMI: ${totalRecords} ta yozuv`);
}

main().catch(console.error);
