import 'dotenv/config';
import { crawlRealEstateData } from './crawler.js';
import { saveToFirestore } from './storage.js';

async function main() {
  const isTest = process.argv.includes('--test');
  
  // 支援指定季度，例如 --season=113S4
  const seasonArg = process.argv.find(arg => arg.startsWith('--season='));
  const season = seasonArg ? seasonArg.split('=')[1] : null;
  
  console.log('========================================');
  console.log('  桃園市實價登錄爬蟲');
  console.log('========================================');
  
  try {
    // 爬取資料
    const result = await crawlRealEstateData(season);
    
    console.log('\n--- 爬取結果摘要 ---');
    console.log(`季度: ${result.season}`);
    console.log(`預售屋: ${result.preSale.length} 筆`);
    
    // 測試模式只爬取不寫入
    if (isTest) {
      console.log('\n[測試模式] 跳過寫入 Firestore');
      console.log('前 3 筆預售屋資料:');
      console.log(JSON.stringify(result.preSale.slice(0, 3), null, 2));
      return;
    }
    
    // 寫入 Firestore
    await saveToFirestore(result);
    
    console.log('\n========================================');
    console.log('  爬蟲執行完成！');
    console.log('========================================');
    
  } catch (error) {
    console.error('\n爬蟲執行失敗:', error);
    process.exit(1);
  }
}

main();
