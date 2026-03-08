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
  
  // 資料通常延遲 1-2 季，預設抓上上季的資料
  let targetYear = year;
  let targetSeason = season - 2;
  
  if (targetSeason <= 0) {
    targetYear -= 1;
    targetSeason += 4;
  }
  
  return `${targetYear}S${targetSeason}`;
}

/**
 * 下載實價登錄資料（CSV 或 ZIP 格式）
 */
async function downloadData(season, transactionType) {
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
 * 解析資料（自動判斷 CSV 或 ZIP 格式）
 */
function parseData(dataBuffer) {
  const allRecords = [];
  let csvContent;
  
  // 檢查是否為 ZIP 格式（ZIP 檔案開頭為 PK）
  if (dataBuffer[0] === 0x50 && dataBuffer[1] === 0x4B) {
    // ZIP 格式
    const zip = new AdmZip(dataBuffer);
    const entries = zip.getEntries();
    
    for (const entry of entries) {
      if (entry.entryName.endsWith('.csv')) {
        csvContent = entry.getData().toString('utf8').replace(/^\uFEFF/, '');
        break;
      }
    }
  } else {
    // CSV 格式，移除 BOM
    csvContent = dataBuffer.toString('utf8').replace(/^\uFEFF/, '');
  }
  
  if (!csvContent) {
    return allRecords;
  }
  
  const lines = csvContent.split('\n');
  
  // 找到中文標題行（包含「鄉鎮市區」的那行）
  let headerIndex = -1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].includes('鄉鎮市區')) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    console.log('找不到標題行');
    return allRecords;
  }
  
  // 取得標題行
  const headerLine = lines[headerIndex];
  
  // 跳過英文標題行（第二行），從第三行開始是資料
  const dataStartIndex = headerIndex + 2;
  const dataLines = [headerLine, ...lines.slice(dataStartIndex)].join('\n');
  
  if (dataLines.trim()) {
    const records = parse(dataLines, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });
    
    allRecords.push(...records);
  }
  
  return allRecords;
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
 * 主要爬蟲函數（只爬取預售屋資料）
 */
export async function crawlRealEstateData(season = null) {
  const targetSeason = season || getCurrentSeason();
  console.log(`開始爬取 ${targetSeason} 的預售屋資料...`);
  
  const results = {
    preSale: [],
  };
  
  // 爬取預售屋資料
  try {
    console.log('\n=== 爬取預售屋買賣資料 ===');
    const dataBuffer = await downloadData(targetSeason, CONFIG.TRANSACTION_TYPES.PRE_SALE);
    const records = parseData(dataBuffer);
    results.preSale = records.map(transformPreSaleRecord).filter(r => r.district);
    console.log(`預售屋資料: ${results.preSale.length} 筆`);
  } catch (error) {
    console.error('預售屋資料爬取失敗:', error.message);
  }
  
  return { season: targetSeason, ...results };
}
