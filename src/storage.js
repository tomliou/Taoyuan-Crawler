import { initFirebase } from './firebase.js';
import { CONFIG } from './config.js';

/**
 * 批次寫入 Firestore
 * Firestore 單次批次最多 500 筆，這裡分批處理
 */
async function batchWrite(db, collectionName, records, season) {
  const BATCH_SIZE = 400;
  let totalWritten = 0;
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = records.slice(i, i + BATCH_SIZE);
    
    for (const record of chunk) {
      // 用 serialNumber + season 作為文件 ID，避免重複
      const docId = `${season}_${record.serialNumber || Date.now() + Math.random()}`;
      const docRef = db.collection(collectionName).doc(docId);
      batch.set(docRef, {
        ...record,
        season,
      }, { merge: true });
    }
    
    await batch.commit();
    totalWritten += chunk.length;
    console.log(`  已寫入 ${totalWritten}/${records.length} 筆到 ${collectionName}`);
  }
  
  return totalWritten;
}

/**
 * 儲存爬蟲結果到 Firestore（只儲存預售屋資料）
 */
export async function saveToFirestore(crawlResult) {
  const db = initFirebase();
  const { season, preSale } = crawlResult;
  
  console.log('\n=== 開始寫入 Firestore ===');
  
  const summary = {
    season,
    preSaleCount: 0,
    updatedAt: new Date(),
  };
  
  // 寫入預售屋資料
  if (preSale.length > 0) {
    console.log(`\n寫入預售屋資料 (${preSale.length} 筆)...`);
    summary.preSaleCount = await batchWrite(db, CONFIG.COLLECTIONS.PRE_SALE, preSale, season);
  }
  
  // 更新爬蟲執行紀錄
  await db.collection('crawlerLogs').doc(season).set(summary);
  
  console.log('\n=== 寫入完成 ===');
  console.log(`預售屋: ${summary.preSaleCount} 筆`);
  
  return summary;
}
