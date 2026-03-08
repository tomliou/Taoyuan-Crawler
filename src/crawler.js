import fetch from 'node-fetch';
import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import { CONFIG } from './config.js';

/**
 * 取得當前季度資訊
 * 實價登錄資料以「民國年+季」為單位，例如 113S4 = 民國113年第4季
 */
function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear() - 1911; // 轉民國年
  const month = now.getMonth() + 1;
  const season = Math.ceil(month / 3);
  
  // 如果是該季第一個月，抓上一季的資料（因為當季資料還沒出）
  if (month % 3 === 1) {
    if (season === 1) {
      return `${year - 1}S4`;
    }
    return `${year}S${season - 1}`;
  }
  
  return `${year}S${season}`;
}

/**
 * 下載實價登錄 ZIP 檔案
 */
async function downloadZip(season, transactionType) {
  const url = `${CONFIG.BASE_URL}?season=${season}&type=${transactionType}&fileName=${CONFIG.CITY_CODE}_lvr_land_${transactionType}.csv`;
  
  console.log(`下載中: ${url}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`下載失敗: ${response.status} ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

/**
 * 解壓縮並解析 CSV
 */
function parseZipCsv(zipBuffer) {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  
  const allRecords = [];
  
  for (const entry of entries) {
    if (entry.entryName.endsWith('.csv')) {
      const csvContent = entry.getData().toString('utf8');
      
      // 跳過前兩行（標題說明）
      const lines = csvContent.split('\n');
      const dataLines = lines.slice(2).join('\n');
      
      if (dataLines.trim()) {
        const records = parse(dataLines, {
          columns: true,
          skip_empty_lines: true,
          relax_column_count: true,
        });
        
        allRecords.push(...records);
      }
    }
  }
  
  return allRecords;
}

/**
 * 轉換買賣資料格式
 */
function transformBuySellRecord(record) {
  return {
    // 基本資訊
    district: record['鄉鎮市區'] || '',
    transactionType: record['交易標的'] || '',
    address: record['土地位置建物門牌'] || '',
    
    // 土地資訊
    landArea: parseFloat(record['土地移轉總面積平方公尺']) || 0,
    zoning: record['都市土地使用分區'] || '',
    landUse: record['非都市土地使用分區'] || '',
    
    // 建物資訊
    buildingType: record['建物型態'] || '',
    buildingArea: parseFloat(record['建物移轉總面積平方公尺']) || 0,
    mainUse: record['主要用途'] || '',
    mainMaterial: record['主要建材'] || '',
    buildingAge: record['建築完成年月'] || '',
    floors: record['總樓層數'] || '',
    floor: record['移轉層次'] || '',
    
    // 交易資訊
    totalPrice: parseInt(record['總價元']) || 0,
    unitPrice: parseInt(record['單價元平方公尺']) || 0,
    parkingSpace: record['車位類別'] || '',
    parkingPrice: parseInt(record['車位總價元']) || 0,
    parkingArea: parseFloat(record['車位移轉總面積平方公尺']) || 0,
    
    // 日期
    transactionDate: record['交易年月日'] || '',
    registrationDate: record['登記日期'] || '',
    
    // 其他
    note: record['備註'] || '',
    serialNumber: record['編號'] || '',
    
    // 元資料
    createdAt: new Date(),
    source: 'plvr.land.moi.gov.tw',
  };
}

/**
 * 轉換預售屋資料格式
 */
function transformPreSaleRecord(record) {
  return {
    district: record['鄉鎮市區'] || '',
    buildingName: record['建案名稱'] || '',
    address: record['土地位置建物門牌'] || '',
    
    landArea: parseFloat(record['土地移轉總面積平方公尺']) || 0,
    buildingArea: parseFloat(record['建物移轉總面積平方公尺']) || 0,
    
    totalPrice: parseInt(record['總價元']) || 0,
    unitPrice: parseInt(record['單價元平方公尺']) || 0,
    
    transactionDate: record['交易年月日'] || '',
    
    note: record['備註'] || '',
    serialNumber: record['編號'] || '',
    
    createdAt: new Date(),
    source: 'plvr.land.moi.gov.tw',
  };
}

/**
 * 轉換租賃資料格式
 */
function transformRentRecord(record) {
  return {
    district: record['鄉鎮市區'] || '',
    address: record['土地位置建物門牌'] || '',
    
    buildingType: record['建物型態'] || '',
    buildingArea: parseFloat(record['建物總面積平方公尺']) || 0,
    
    monthlyRent: parseInt(record['租金']) || 0,
    
    floors: record['總樓層數'] || '',
    floor: record['租賃層次'] || '',
    
    leaseStartDate: record['租賃年月日'] || '',
    leasePeriod: record['租賃期間'] || '',
    
    note: record['備註'] || '',
    serialNumber: record['編號'] || '',
    
    createdAt: new Date(),
    source: 'plvr.land.moi.gov.tw',
  };
}

/**
 * 主要爬蟲函數
 */
export async function crawlRealEstateData(season = null) {
  const targetSeason = season || getCurrentSeason();
  console.log(`開始爬取 ${targetSeason} 的資料...`);
  
  const results = {
    buySell: [],
    preSale: [],
    rent: [],
  };
  
  // 爬取買賣資料
  try {
    console.log('\n=== 爬取不動產買賣資料 ===');
    const zipBuffer = await downloadZip(targetSeason, CONFIG.TRANSACTION_TYPES.BUY_SELL);
    const records = parseZipCsv(zipBuffer);
    results.buySell = records.map(transformBuySellRecord).filter(r => r.district);
    console.log(`買賣資料: ${results.buySell.length} 筆`);
  } catch (error) {
    console.error('買賣資料爬取失敗:', error.message);
  }
  
  // 爬取預售屋資料
  try {
    console.log('\n=== 爬取預售屋買賣資料 ===');
    const zipBuffer = await downloadZip(targetSeason, CONFIG.TRANSACTION_TYPES.PRE_SALE);
    const records = parseZipCsv(zipBuffer);
    results.preSale = records.map(transformPreSaleRecord).filter(r => r.district);
    console.log(`預售屋資料: ${results.preSale.length} 筆`);
  } catch (error) {
    console.error('預售屋資料爬取失敗:', error.message);
  }
  
  // 爬取租賃資料
  try {
    console.log('\n=== 爬取不動產租賃資料 ===');
    const zipBuffer = await downloadZip(targetSeason, CONFIG.TRANSACTION_TYPES.RENT);
    const records = parseZipCsv(zipBuffer);
    results.rent = records.map(transformRentRecord).filter(r => r.district);
    console.log(`租賃資料: ${results.rent.length} 筆`);
  } catch (error) {
    console.error('租賃資料爬取失敗:', error.message);
  }
  
  return { season: targetSeason, ...results };
}
