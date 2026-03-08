import { crawlRealEstateData } from './crawler.js';
import { saveToFirestore } from './storage.js';

async function main() {
  const isTest = process.argv.includes('--test');
  
  console.log('========================================');
  console.log('  桃園市實價登錄爬蟲');
  console.log('========================================');
  
  try {
    // 爬取資料
    const result = await crawlRealEstateData();
    
    console.log('\n--- 爬取結果摘要 ---');
    console.log(`季度: ${result.season}`);
    console.log(`買賣: ${result.buySell.length} 筆`);
    console.log(`預售屋: ${result.preSale.length} 筆`);
    console.log(`租賃: ${result.rent.length} 筆`);
    
    // 測試模式只爬取不寫入
    if (isTest) {
      console.log('\n[測試模式] 跳過寫入 Firestore');
      console.log('前 3 筆買賣資料:');
      console.log(JSON.stringify(result.buySell.slice(0, 3), null, 2));
      return;
    }
    
    // 寫入 Firestore
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error('缺少 FIREBASE_SERVICE_ACCOUNT 環境變數');
    }
    
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
