/**
 * 依「抓取時間」(createdAt) 刪除 Firestore 文件
 * 使用方式：node scripts/delete-by-created-at.js
 * 預設刪除 2026-03-10 (UTC+8) 當天寫入的資料
 */
import 'dotenv/config';
import { initFirebase } from '../src/firebase.js';
import { CONFIG } from '../src/config.js';

// 要刪除的日期（抓取日，以 UTC+8 為準）
const TARGET_DATE = '2026-03-10'; // YYYY-MM-DD
const BATCH_SIZE = 500; // Firestore 單次 batch 上限

function getDayRangeUTC(dateStr) {
  // dateStr = '2026-03-10' → 該日 00:00 ~ 23:59:59.999 UTC+8 的 Date
  const start = new Date(`${dateStr}T00:00:00+08:00`);
  const end = new Date(`${dateStr}T23:59:59.999+08:00`);
  return { start, end };
}

async function main() {
  const db = initFirebase();
  const col = db.collection(CONFIG.COLLECTIONS.PRE_SALE);
  const { start, end } = getDayRangeUTC(TARGET_DATE);

  console.log(`查詢 createdAt 在 ${TARGET_DATE} (UTC+8 當日) 的文件...`);
  console.log(`  範圍: ${start.toISOString()} ~ ${end.toISOString()}`);

  const snapshot = await col.where('createdAt', '>=', start).where('createdAt', '<=', end).get();
  const total = snapshot.size;

  if (total === 0) {
    console.log('沒有符合條件的文件，結束。');
    return;
  }

  console.log(`找到 ${total} 筆，開始批次刪除（每批 ${BATCH_SIZE}）...`);

  let deleted = 0;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + BATCH_SIZE);
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += chunk.length;
    console.log(`  已刪除 ${deleted}/${total} 筆`);
  }

  console.log(`完成。共刪除 ${deleted} 筆（抓取時間 ${TARGET_DATE}）。`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
