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
 * 民國轉西元：解析民國年月日字串為 Date（例：1130105 → 2024/1/5）
 * 寫入 Firestore 時會自動轉成 Timestamp
 */
function parseRocDate(ymd) {
  const s = String(ymd || '').trim();
  if (!s) return null;
  // 7 碼：民國年月日 (1130105) → 西元 yyyy/mm/dd
  const m7 = s.match(/^(\d{3})(\d{2})(\d{2})$/);
  if (m7) {
    const y = parseInt(m7[1], 10) + 1911; // 民國轉西元
    const month = parseInt(m7[2], 10) - 1;
    const day = parseInt(m7[3], 10);
    const d = new Date(y, month, day);
    return isNaN(d.getTime()) ? null : d;
  }
  // 5 碼：民國年月 (11301) → 西元當月 1 日
  const m5 = s.match(/^(\d{3})(\d{2})$/);
  if (m5) {
    const y = parseInt(m5[1], 10) + 1911;
    const month = parseInt(m5[2], 10) - 1;
    const d = new Date(y, month, 1);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** 將 Date 轉成西元字串 YYYY-MM-DD，方便顯示與查詢 */
function toWesternDateString(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 數字欄位：先移除千分位再解析，避免 "1,234" 解析錯誤 */
function parseNum(val, parser = parseInt) {
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  if (!cleaned) return 0;
  const n = parser(cleaned, 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * 轉換預售屋資料格式（完整欄位）
 * 日期欄位轉成 Date 以符合 Firestore 型別，數字欄位做千分位清理
 */
function transformPreSaleRecord(record) {
  const rawTransactionDate = record['交易年月日'] || '';
  const rawCompletionDate = record['建築完成年月'] || '';

  const transactionDate = parseRocDate(rawTransactionDate);
  const completionDate = parseRocDate(rawCompletionDate);

  return {
    // 基本資訊
    district: record['鄉鎮市區'] || '',
    transactionTarget: record['交易標的'] || '',
    address: record['土地位置建物門牌'] || '',

    // 土地資訊
    landArea: parseNum(record['土地移轉總面積平方公尺'], parseFloat),
    urbanZoning: record['都市土地使用分區'] || '',
    nonUrbanZoning: record['非都市土地使用分區'] || '',
    nonUrbanLandUse: record['非都市土地使用編定'] || '',

    // 交易資訊（民國→西元：Date 存成 Timestamp，另留西元/民國字串）
    transactionDate,
    transactionDateWestern: toWesternDateString(transactionDate), // 西元 YYYY-MM-DD
    transactionDateRoc: rawTransactionDate || null,
    transactionCount: record['交易筆棟數'] || '',

    // 建物資訊
    floor: record['移轉層次'] || '',
    totalFloors: record['總樓層數'] || '',
    buildingType: record['建物型態'] || '',
    mainUse: record['主要用途'] || '',
    mainMaterial: record['主要建材'] || '',
    completionDate,
    completionDateWestern: toWesternDateString(completionDate),
    completionDateRoc: rawCompletionDate || null,
    buildingArea: parseNum(record['建物移轉總面積平方公尺'], parseFloat),

    // 格局
    rooms: parseNum(record['建物現況格局-房']),
    halls: parseNum(record['建物現況格局-廳']),
    bathrooms: parseNum(record['建物現況格局-衛']),
    partitions: record['建物現況格局-隔間'] || '',

    // 管理
    hasManagement: record['有無管理組織'] || '',

    // 價格
    totalPrice: parseNum(record['總價元']),
    unitPrice: parseNum(record['單價元平方公尺']),

    // 車位
    parkingType: record['車位類別'] || '',
    parkingArea: parseNum(record['車位移轉總面積平方公尺'], parseFloat),
    parkingPrice: parseNum(record['車位總價元']),

    // 其他
    note: record['備註'] || '',
    serialNumber: record['編號'] || '',
    buildingName: record['建案名稱'] || '',
    buildingNumber: record['棟及號'] || '',
    cancelStatus: record['解約情形'] || '',

    // 元資料
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
