import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

  const docRef = doc(db, 'operators', '10'); // Ravshanova Asal ID is '10' in data.ts
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    console.log(`Operator: ${data.name}`);
    console.log(`Total records: ${data.records?.length || 0}`);
    const touched = (data.records || []).filter(r => r.natija || r.izoh);
    console.log(`Touched records: ${touched.length}`);
    console.log('Touched records detail:', touched);
  } else {
    // Try querying by name if ID '10' doesn't exist as document ID
    console.log('Document ID 10 not found. Let\'s check other IDs.');
  }
}

main().catch(console.error);
