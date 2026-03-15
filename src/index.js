import 'dotenv/config';
import { crawlRealEstateData } from './crawler.js';
import { saveToFirestore } from './storage.js';

async function main() {
  const isTest = process.argv.includes('--test');

  // 支援指定季度，例如 --season=113S4
  const seasonArg = process.argv.find(arg => arg.startsWith('--season='));
  const season = seasonArg ? seasonArg.split('=')[1] : null;

  // 支援只處理前 N 筆，例如 --limit=20
  const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

  console.log('========================================');
  console.log('  桃園市實價登錄爬蟲');
  console.log('========================================');
  if (limit) console.log(`  [限制] 只處理前 ${limit} 筆`);
  console.log('');

  try {
    // 爬取資料
    const result = await crawlRealEstateData(season);

    const preSale = limit ? result.preSale.slice(0, limit) : result.preSale;
    const resultLimited = { ...result, preSale };

    console.log('\n--- 爬取結果摘要 ---');
    console.log(`季度: ${result.season}`);
    console.log(`預售屋: ${result.preSale.length} 筆` + (limit ? `（取前 ${preSale.length} 筆）` : ''));

    // 測試模式只爬取不寫入（Firestore 不會有資料，要寫入請用 npm run crawl）
    if (isTest) {
      console.log('\n[測試模式] 跳過寫入 Firestore，Data collection 不會有資料');
      console.log(`前 ${preSale.length} 筆預售屋資料:`);
      console.log(JSON.stringify(preSale, null, 2));
      return;
    }

    // 寫入 Firestore（若有 limit 只寫入前 N 筆）
    await saveToFirestore(resultLimited);
    
    console.log('\n========================================');
    console.log('  爬蟲執行完成！');
    console.log('========================================');
    
  } catch (error) {
    console.error('\n爬蟲執行失敗:', error);
    process.exit(1);
  }
}

main();
