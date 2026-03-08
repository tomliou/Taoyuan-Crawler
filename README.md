# Taoyuan-Crawler

桃園市實價登錄資料爬蟲，定時從內政部網站抓取資料並存入 Firestore。

## 資料來源

- [內政部不動產交易實價查詢服務網](https://plvr.land.moi.gov.tw/)
- 更新頻率：每月 11 日、21 日

## 功能

- 自動下載桃園市的實價登錄資料（CSV 格式）
- 解析並轉換資料格式
- 寫入 Firebase Firestore

## Firestore 集合

| 集合名稱 | 說明 |
|---------|------|
| `realEstate_buySell` | 不動產買賣 |
| `realEstate_preSale` | 預售屋買賣 |
| `realEstate_rent` | 不動產租賃 |
| `crawlerLogs` | 爬蟲執行紀錄 |

## 本地測試

```bash
# 安裝依賴
npm install

# 測試模式（只爬取，不寫入 Firestore）
npm run test
```

## 正式執行

需要設定環境變數 `FIREBASE_SERVICE_ACCOUNT`：

```bash
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
npm run crawl
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

### 買賣資料 (realEstate_buySell)

| 欄位 | 說明 |
|------|------|
| district | 鄉鎮市區 |
| address | 土地位置建物門牌 |
| buildingType | 建物型態 |
| totalPrice | 總價（元） |
| unitPrice | 單價（元/平方公尺） |
| buildingArea | 建物面積（平方公尺） |
| transactionDate | 交易日期 |
| ... | 更多欄位見 crawler.js |

## License

MIT
