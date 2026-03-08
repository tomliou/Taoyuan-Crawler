# Taoyuan-Crawler

桃園市**預售屋**實價登錄資料爬蟲，定時從內政部網站抓取資料並存入 Firebase Firestore。

## 資料來源

- [內政部不動產交易實價查詢服務網](https://plvr.land.moi.gov.tw/)
- 更新頻率：每季更新

## 功能

- 自動下載桃園市的預售屋實價登錄資料
- 解析 CSV 並轉換資料格式
- 寫入 Firebase Firestore

## Firestore 集合

| 集合名稱 | 說明 |
|---------|------|
| `realEstate_preSale` | 預售屋買賣 |
| `crawlerLogs` | 爬蟲執行紀錄 |

## 本地開發

### 安裝

```bash
npm install
```

### 設定 Firebase 憑證

將 Firebase Service Account JSON 檔案放到專案根目錄，命名為 `firebase-service-account.json`。

### 執行

```bash
# 測試模式（只爬取，不寫入 Firestore）
npm run test

# 正式執行（爬取並寫入 Firestore）
npm run crawl

# 指定季度
node src/index.js --season=113S4
```

## GitHub Actions

- **自動執行**：每月 12 日、22 日 UTC 01:00（台灣時間 09:00）
- **手動執行**：到 Actions 頁面點 "Run workflow"

### 設定 Secrets

到 GitHub repo → Settings → Secrets → Actions，新增：

| Name | Value |
|------|-------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase 服務帳戶 JSON（完整內容） |

## 資料欄位說明

### 預售屋資料 (realEstate_preSale)

| 欄位 | 說明 |
|------|------|
| district | 鄉鎮市區 |
| buildingName | 建案名稱 |
| address | 土地位置建物門牌 |
| landArea | 土地面積（平方公尺） |
| buildingArea | 建物面積（平方公尺） |
| totalPrice | 總價（元） |
| unitPrice | 單價（元/平方公尺） |
| transactionDate | 交易日期（民國年月日） |
| note | 備註 |
| serialNumber | 編號 |
| season | 資料季度（如 113S4） |

## License

MIT
