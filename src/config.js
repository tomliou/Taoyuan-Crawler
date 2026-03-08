// 實價登錄下載設定
export const CONFIG = {
  // 內政部實價登錄下載 API
  BASE_URL: 'https://plvr.land.moi.gov.tw/DownloadSeason',
  
  // 要抓取的縣市代碼
  CITY_CODE: 'H',  // H = 桃園市
  
  // 交易類型
  TRANSACTION_TYPES: {
    BUY_SELL: 'a',      // 不動產買賣
    PRE_SALE: 'b',      // 預售屋買賣
    RENT: 'c',          // 不動產租賃
  },
  
  // Firestore 集合名稱
  COLLECTIONS: {
    BUY_SELL: 'realEstate_buySell',
    PRE_SALE: 'realEstate_preSale', 
    RENT: 'realEstate_rent',
  },
};

// 桃園市各區對照
export const DISTRICTS = {
  '桃園區': 'taoyuan',
  '中壢區': 'zhongli',
  '平鎮區': 'pingzhen',
  '八德區': 'bade',
  '楊梅區': 'yangmei',
  '蘆竹區': 'luzhu',
  '龜山區': 'guishan',
  '龍潭區': 'longtan',
  '大溪區': 'daxi',
  '大園區': 'dayuan',
  '觀音區': 'guanyin',
  '新屋區': 'xinwu',
  '復興區': 'fuxing',
};
