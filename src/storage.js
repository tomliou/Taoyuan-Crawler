import { initFirebase } from './firebase.js';
import { CONFIG } from './config.js';

/**
 * 延遲函數
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 批次寫入 Firestore
 */
async function batchWrite(db, collectionName, records, season) {
  const BATCH_SIZE = 50; // 每批 50 筆
  let totalWritten = 0;
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);
  
  console.log(`  總共 ${totalBatches} 個批次，每批 ${BATCH_SIZE} 筆`);
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = db.batch();
    const chunk = records.slice(i, i + BATCH_SIZE);
    
    console.log(`  [${batchNum}/${totalBatches}] 寫入 ${chunk.length} 筆...`);
    
    try {
      for (const record of chunk) {
        const docId = `${season}_${record.serialNumber || Date.now() + Math.random()}`;
        const docRef = db.collection(collectionName).doc(docId);
        batch.set(docRef, {
          ...record,
          season,
        }, { merge: true });
      }
      
      const startTime = Date.now();
      await batch.commit();
      const elapsed = Date.now() - startTime;
      
      totalWritten += chunk.length;
      console.log(`  [${batchNum}/${totalBatches}] ✅ (${elapsed}ms) 累計 ${totalWritten}/${records.length} 筆`);
      
      // 每批之間稍微延遲，避免觸發限流
      if (i + BATCH_SIZE < records.length) {
        await delay(100);
      }
    } catch (error) {
      console.error(`  [${batchNum}/${totalBatches}] ❌ 失敗:`, error.message);
      throw error;
    }
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
