import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db = null;

export function initFirebase() {
  if (db) return db;

  let serviceAccount;
  
  // 優先使用環境變數，否則使用本地檔案
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    const credPath = join(__dirname, '..', 'firebase-service-account.json');
    if (existsSync(credPath)) {
      serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
    } else {
      throw new Error('找不到 Firebase 憑證，請設定 FIREBASE_SERVICE_ACCOUNT 環境變數或提供 firebase-service-account.json 檔案');
    }
  }
  
  initializeApp({
    credential: cert(serviceAccount),
  });

  db = getFirestore();
  return db;
}

export { db };
