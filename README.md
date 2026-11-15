# Last Bastion 最後堡壘

以地下堡壘的空間結構作為導覽的個人創作展示網站。
每一道**樓梯**代表一層，每一條**走廊**代表同層的房間；左側通道圖的燈號標示目前所在位置。

- 版本：v0.2
- 技術：純 HTML / CSS / SVG / 原生 JavaScript，無建置流程、無外部依賴
- 部署目標：GitHub Pages（專案站 `https://<帳號>.github.io/LastBastion/`）

## 目錄結構

```text
LastBastion/
├── index.html                 外殼：橫幅、通道圖容器、內容區
├── assets/
│   ├── css/
│   │   ├── common.css         變數（色彩、字體）、重設、無障礙工具
│   │   ├── fortress.css       橫幅、通道圖、版面骨架、響應式
│   │   └── rooms.css          房間內文區塊、聯絡清單、外部專案卡片
│   ├── js/
│   │   ├── navigation.js      讀取導覽資料、產生樓梯／走廊選單
│   │   ├── projects.js        讀取外部專案資料、填入房間內的入口
│   │   └── app.js             hash 路由、內容載入、示範互動
│   └── images/
│       ├── emblem.svg         網站標誌（favicon）
│       ├── vines-left.svg     橫幅左側藤蔓（可獨立替換）
│       └── vines-right.svg    橫幅右側藤蔓
├── data/
│   ├── navigation.json        樓層與房間結構（唯一導覽來源）
│   └── projects.json          外部專案清單（各房間共用）
├── content/                   各房間的 HTML 內文稿件
│   ├── B1-lounge/index.html            交誼廳（首頁）
│   ├── B1-lounge/annex/index.html      副廳
│   ├── B2-dormitory/index.html         宿舍
│   ├── B2-dormitory/room-1|2|3/        房間 1～3
│   ├── B3-workshop/index.html          工務區（樓層門廳）
│   ├── B3-armory/index.html            裝備間
│   ├── B3-training/index.html          訓練室
│   ├── B4-command/index.html           指揮部
│   └── B5-contact/index.html           與我聯絡
├── README.md
└── CHANGELOG.md
```

## 本機預覽

專案必須透過 HTTP 開啟，直接雙擊 `index.html`（`file://`）會被瀏覽器擋掉 `fetch`。

```powershell
cd D:\LastBastion
python -m http.server 8080
```

開啟 <http://localhost:8080/>。沒有 Python 時可用 `npx serve .`。

## 新增房間

1. **建立內文**：在 `content/` 下新增資料夾與 `index.html`，只寫房間內容（`<section class="room-section">` 等），不要 `<html>`／`<head>`。
2. **登記房間**：在 `data/navigation.json` 對應樓層的 `rooms` 陣列加入條目：

   ```json
   {
     "id": "archive",
     "label": "檔案室",
     "code": "B4-02",
     "path": "content/B4-archive/index.html",
     "summary": "一句話說明這間房。"
   }
   ```

   - 放在另一間房的 `children` 裡，就會成為走廊上的房門。
   - `id` 會變成網址 `#/archive`，請保持唯一且使用小寫英文。
3. **加樣式（選用）**：在 `assets/css/rooms.css` 末端用 `[data-room="archive"]` 撰寫該房專屬規則。
4. 重新整理即可，導覽與麵包屑會自動長出來。

新增樓層則在 `data/navigation.json` 的 `floors` 陣列加一筆 `{ id, code, name, rooms }`，樓梯列會自動出現。

## 外部專案入口

房間可以列出其他網站與作品，資料統一放在 `data/projects.json`，不必改動房間文稿的結構。

1. 在 `data/projects.json` 的 `projects` 陣列加入一筆：

   ```json
   {
     "id": "rp-engine",
     "name": "RP Engine",
     "summary": "一句話說明這個專案。",
     "url": "https://example.com/rp-engine",
     "year": "2026",
     "tags": ["TOOL", "WEB"],
     "status": "live",
     "rooms": ["armory"]
   }
   ```

   | 欄位 | 說明 |
   | --- | --- |
   | `id` | 唯一識別碼，小寫英文 |
   | `name` | 卡片標題 |
   | `summary` | 一行說明 |
   | `url` | 外部網址；留空則顯示「連結待補」，不會產生空連結 |
   | `year` | 年份，僅供顯示與排序 |
   | `tags` | 最多顯示三個標籤 |
   | `status` | `live` 已發布、`wip` 開發中、`draft` 規劃中、`hold` 暫停 |
   | `rooms` | 要顯示的房間 id；省略或空陣列則顯示在所有容器 |

2. 在房間文稿放置容器：

   ```html
   <div data-projects="armory"></div>
   ```

   `data-projects` 填房間 id 只顯示該房列出的專案；填 `all` 或留空則顯示全部。容器可放在任何房間、任何位置，一個房間也可以放多個。

3. 排序：依 `status`（已發布 → 開發中 → 規劃中 → 暫停）、再依 `year` 由新到舊。

樣式沿用 `rooms.css` 的 `.project-list`／`.project`；置中與留白由容器所在區塊決定。

## 聯絡頁

`content/B5-contact/index.html` 以清單呈現各聯絡管道，兩種列：

- **可點擊**：`<a class="contact" href="…" target="_blank" rel="noopener noreferrer">`，右側顯示 `↗`。
- **尚未開放**：`<div class="contact is-pending">`，右側掛 `未開放` 標籤，不會產生空連結。

要開放電子郵件或社群時，把該列的 `<div class="contact is-pending">` 換成 `<a class="contact" href="…">`，並更新 `contact__handle` 與右側內容即可。`data-room="contact"` 的專屬樣式在 `rooms.css` 末端。

## 內容規範

- **內文稿件只寫片段**：房間標題、樓層與簡短說明由 `navigation.json` 提供，內文不要重複。
- **語氣**：簡短說明「這裡放什麼、怎麼分類」，不寫引導讀者操作的語句。
- **路徑一律相對**：圖片放在 `assets/images/`，文稿內用 `../` 或站根相對路徑引用；程式端以 `document.baseURI` 解析，部署到子目錄不需修改。
- **連結寫法**：站內切換用 `href="#/房間-id"`；外部連結加 `target="_blank" rel="noopener noreferrer"`。
- **樣式分層**：共用區塊（卡片、公告、表格、展示框、聯絡列、專案卡）在 `rooms.css` 已有樣板，優先用既有 class。
- **字體集中**：所有字體在 `common.css` 的 `--font-sans`、`--font-display`、`--font-mono` 管理。
- **圖片**：建議壓到 400KB 以下；PNG／WebP／SVG 皆可。

## 部署到 GitHub Pages

```powershell
cd D:\LastBastion
git init
git add .
git commit -m "Last Bastion v0.2"
git branch -M main
git remote add origin https://github.com/sora0811/LastBastion.git
git push -u origin main
```

到 repository 的 **Settings → Pages**，Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾 `/ (root)`，存檔後約一分鐘可於
`https://sora0811.github.io/LastBastion/` 看到。

- 網站是純靜態檔案，不需要 Actions。
- 已附 `.nojekyll`，避免 Jekyll 處理 `assets/` 內的特殊檔名。
- `index.html` 位於根目錄，hash 路由（`#/房間-id`）不需要任何伺服器改寫規則。

## 驗收清單（v0.2）

- [x] 以靜態 HTTP 伺服器可正常預覽
- [x] 橫幅招牌、藤蔓盆栽與暖色工業風配色
- [x] 樓梯／走廊的視覺層級與展開收合
- [x] 全部房間可切換、目前位置有燈號提示
- [x] 重新整理後回到原房間（hash 路由）
- [x] 相對路徑，相容 GitHub Pages 專案站
- [x] 桌面與行動版面（側欄抽屜、漢堡按鈕）
- [x] 醫療站改為「與我聯絡」，聯絡管道可留空並標示狀態
- [x] 外部專案入口只需改 `projects.json`，未填網址不會產生空連結
- [x] 房間文案改為簡短說明，不再引導操作
- [x] README 說明預覽、新增內容、外部專案與部署

## 授權

網站程式碼與版面可自由參考；文字、角色與插畫等創作內容保留所有權利，轉載前請先聯絡。
