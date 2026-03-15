# 實價登錄預售屋 — Excel 表頭與 Data 英文欄位對照

資料來源：內政部不動產交易實價查詢服務網（預售屋買賣 CSV）。  
本文件對應爬蟲解析後的 **Firestore / JSON 英文欄位名** 與 **原始 Excel/CSV 中文表頭**。

---

## 對照表

| Excel / CSV 表頭（中文） | Data 英文欄位名 | 型別 | 範例值 | 說明 |
|--------------------------|-----------------|------|--------|------|
| 鄉鎮市區 | `district` | string | 中壢區 | 鄉鎮市區 |
| 交易標的 | `transactionTarget` | string | 房地(土地+建物)+車位 | 交易標的 |
| 土地位置建物門牌 | `address` | string | 桃園市中壢區和豐街、和美街附近豐興段312、313地號 | 土地位置建物門牌 |
| 土地移轉總面積平方公尺 | `landArea` | number | 28.01 | 土地面積（平方公尺） |
| 都市土地使用分區 | `urbanZoning` | string | 住 | 都市土地使用分區 |
| 非都市土地使用分區 | `nonUrbanZoning` | string | （空）或 特定農業區 | 非都市土地使用分區 |
| 非都市土地使用編定 | `nonUrbanLandUse` | string | （空）或 甲種建築用地 | 非都市土地使用編定 |
| 交易年月日 | `transactionDate` | **Timestamp** | （Firestore 時間戳） | 交易日期（民國→西元） |
| 交易年月日 | `transactionDateWestern` | string \| null | 2025-05-11 | 西元日期 YYYY-MM-DD |
| 交易年月日 | `transactionDateRoc` | string \| null | 1140511 | 民國字串 |
| 交易筆棟數 | `transactionCount` | string | 土地2建物1車位1 | 交易筆棟數 |
| 移轉層次 | `floor` | string | 一層 | 移轉層次 |
| 總樓層數 | `totalFloors` | string | 15 | 總樓層數 |
| 建物型態 | `buildingType` | string | 住宅大樓(11層含以上有電梯) | 建物型態 |
| 主要用途 | `mainUse` | string | 住商用 | 主要用途 |
| 主要建材 | `mainMaterial` | string | 鋼筋混凝土造 | 主要建材 |
| 建築完成年月 | `completionDate` | **Timestamp** \| null | null（預售屋常為空） | 建築完成年月 |
| 建築完成年月 | `completionDateWestern` | string \| null | null | 西元 YYYY-MM-DD |
| 建築完成年月 | `completionDateRoc` | string \| null | null | 民國字串 |
| 建物移轉總面積平方公尺 | `buildingArea` | number | 186.52 | 建物面積（平方公尺） |
| 建物現況格局-房 | `rooms` | number | 1 | 房數 |
| 建物現況格局-廳 | `halls` | number | 2 | 廳數 |
| 建物現況格局-衛 | `bathrooms` | number | 2 | 衛數 |
| 建物現況格局-隔間 | `partitions` | string | 有 | 隔間 |
| 有無管理組織 | `hasManagement` | string | 無 | 有無管理組織 |
| 總價元 | `totalPrice` | number | 27140000 | 總價（元） |
| 單價元平方公尺 | `unitPrice` | number | 166412 | 單價（元/平方公尺） |
| 車位類別 | `parkingType` | string | 坡道平面 | 車位類別 |
| 車位移轉總面積平方公尺 | `parkingArea` | number | 36.05 | 車位面積（平方公尺） |
| 車位總價元 | `parkingPrice` | number | 2100000 | 車位總價（元） |
| 備註 | `note` | string | （空）或 親友、員工…之交易 | 備註 |
| 編號 | `serialNumber` | string | RPUNMLMKNHKGFBH48CB | 編號 |
| 建案名稱 | `buildingName` | string | 厚陞晴 | 建案名稱 |
| 棟及號 | `buildingNumber` | string | A1棟1樓號 | 棟及號 |
| 解約情形 | `cancelStatus` | string | （空） | 解約情形 |

---

## 程式產生的欄位（非 Excel 表頭）

| Data 英文欄位名 | 型別 | 範例值 | 說明 |
|-----------------|------|--------|------|
| `season` | string | 114S3 | 資料季度，寫入 Firestore 時加上 |
| `createdAt` | Timestamp | （寫入當下時間戳） | 爬蟲寫入時間 |
| `source` | string | plvr.land.moi.gov.tw | 固定值 |

---

## 僅在 schema 中、本爬蟲未匯入的 Excel 欄位

以下為原始 schema 有、但目前爬蟲**未對應**至英文欄位的表頭，供檢視用：

| Excel / CSV 表頭（中文） | 說明 |
|--------------------------|------|
| 主建物面積 | 主建物面積 |
| 附屬建物面積 | 附屬建物面積 |
| 陽台面積 | 陽台面積 |
| 電梯 | 電梯 |
| 移轉編號 | 移轉編號 |

若日後要匯入，可在 `src/crawler.js` 的 `transformPreSaleRecord` 中新增對應欄位。

---

## 型別與轉換說明

- **日期**：原始為民國（如 1140511），程式轉成 `transactionDate` / `completionDate`（Firestore Timestamp），並保留 `transactionDateRoc` / `transactionDateWestern` 等字串。
- **數字**：土地面積、建物面積、總價、單價、房廳衛、車位面積與車位總價等，會先移除千分位再以 **number** 寫入。
- **字串**：其餘欄位以 **string** 寫入，空值多為 `""` 或（部分欄位）`null`。
