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

  const docRef = doc(db, 'operators', '10');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    console.log(JSON.stringify(data.records?.slice(0, 10), null, 2));
  }
}

main().catch(console.error);
