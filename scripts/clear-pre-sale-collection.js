/**
 * 清空 realEstate_preSale 集合內所有文件
 * 使用方式：node scripts/clear-pre-sale-collection.js
 */
import 'dotenv/config';
import { initFirebase } from '../src/firebase.js';
import { CONFIG } from '../src/config.js';

const BATCH_SIZE = 500;

async function main() {
  const db = initFirebase();
  const col = db.collection(CONFIG.COLLECTIONS.PRE_SALE);

  console.log(`讀取 ${CONFIG.COLLECTIONS.PRE_SALE} 全部文件...`);
  const snapshot = await col.get();
  const total = snapshot.size;

  if (total === 0) {
    console.log('集合已是空的，結束。');
    return;
  }

  console.log(`找到 ${total} 筆，開始批次刪除（每批 ${BATCH_SIZE}）...`);
  const docs = snapshot.docs;
  let deleted = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    docs.slice(i, i + BATCH_SIZE).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += Math.min(BATCH_SIZE, docs.length - i);
    console.log(`  已刪除 ${deleted}/${total} 筆`);
  }

  console.log(`完成。共刪除 ${deleted} 筆。`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
