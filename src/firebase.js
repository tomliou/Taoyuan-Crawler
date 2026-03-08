import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db = null;

export function initFirebase() {
  if (db) return db;

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  
  initializeApp({
    credential: cert(serviceAccount),
  });

  db = getFirestore();
  return db;
}

export { db };
