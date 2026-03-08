import { initFirebase } from './firebase.js';
import { CONFIG } from './config.js';

/**
 * 批次寫入 Firestore（並行處理加速）
 * Firestore 單次批次最多 500 筆，這裡分批並行處理
 */
async function batchWrite(db, collectionName, records, season) {
  const BATCH_SIZE = 500;
  const PARALLEL_BATCHES = 5; // 同時執行的批次數
  
  const chunks = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    chunks.push(records.slice(i, i + BATCH_SIZE));
  }
  
  let totalWritten = 0;
  
  // 並行處理多個批次
  for (let i = 0; i < chunks.length; i += PARALLEL_BATCHES) {
    const parallelChunks = chunks.slice(i, i + PARALLEL_BATCHES);
    
    const promises = parallelChunks.map(async (chunk) => {
      const batch = db.batch();
      
      for (const record of chunk) {
        const docId = `${season}_${record.serialNumber || Date.now() + Math.random()}`;
        const docRef = db.collection(collectionName).doc(docId);
        batch.set(docRef, {
          ...record,
          season,
        }, { merge: true });
      }
      
      await batch.commit();
      return chunk.length;
    });
    
    const results = await Promise.all(promises);
    totalWritten += results.reduce((a, b) => a + b, 0);
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
