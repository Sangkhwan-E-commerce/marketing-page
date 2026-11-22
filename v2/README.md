# หน้าเว็บ Lullapos v2 (แผงการ์ด Widget)

เว็บหน้าแรกใหม่ ทำงานคู่กับเว็บเก่า: เว็บเก่าอยู่ที่ `/` ส่วน v2 อยู่ที่ `/v2` (ต่อไว้ใน `server.js` ก่อน session และก่อน `/:slug`)

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `index.js` | `createV2App()` แอปย่อยของ Express: หน้า `/` (ไทย), `/en`, `/assets/*`, `/api/widgets.json` |
| `registry.js` | อ่านทุกโฟลเดอร์ใน `widgets/` เอง ตรวจข้อมูลประจำตัวตอนเปิดเว็บ (ผิด = เปิดเว็บไม่ขึ้น) |
| `layout.js` | รายการการ์ดที่แสดง · ตอนนี้ใช้ `DEFAULT_LAYOUT` · ภายหลังรับ `loadPublished` จากตาราง `lp_*` |
| `mock-data.js` | ข้อมูลสมมุติชุดกลาง (ร้านเดียวกับคู่มือ `/doc`) — การ์ดที่ใช้จะมีป้าย "ตัวอย่าง" เสมอ |
| `i18n.js` | ข้อความของโครงหน้า ไทย/อังกฤษ |
| `views/page.ejs` | โครงหน้า + กรอบการ์ดกลาง (หัวการ์ด ป้าย ลิงก์คู่มือ) |
| `public/` | CSS/JS ของโครงหน้า + ไอคอนและฟอนต์ที่เก็บไว้เอง (ไม่ใช้ CDN) |

## เพิ่ม Widget ใหม่

สร้างโฟลเดอร์ `widgets/<id>/` (id แบบ kebab-case ตรงกับชื่อโฟลเดอร์):

- `widget.js` — `id`, `category`, `sizes` (จาก `1x1 2x1 1x2 2x2 3x1 4x1`), `defaultSize`, `dataSources` (`mock` / `live`), `docPath` (บทความใน `/doc`), `tone` (`light dark blue green orange`), `settings` (ช่องตั้งค่าที่หน้า Admin จะสร้างฟอร์มให้: `text select boolean number`), `text.th` / `text.en` (ต้องมี `name`), `getData({ mock, locale, settings, source, size })`
- `view.ejs` — หน้าตาข้างในการ์ด ได้ตัวแปร `data text locale settings size fmt pick`
- `style.css` (ถ้ามี) — ขึ้นต้นคลาสด้วย `w-<ชื่อสั้น>-` กันชนกับการ์ดอื่น · ปรับตามขนาดด้วย `.lp-size-2x1 ...` และตามสีด้วย `.lp-tone-dark ...`
- `script.js` (ถ้ามี) — `LP.widget('<id>', function (card, ctx) { ... })` เริ่มเมื่อการ์ดเลื่อนเข้าจอ · `ctx.reducedMotion` = ห้ามขยับ
- ตัวเลขนับขึ้น: `<span data-countup="1234">` (ใส่ค่าจริงไว้ข้างในด้วย เผื่อ JS ไม่ทำงาน)

แล้วรัน `npm test`

## ตั้งค่าการ์ด (เจ้าของสั่ง 2026-11-22: ตั้งค่าได้ละเอียดทุกการ์ด แต่ทุกช่องมีค่าเริ่มต้น)

- **ช่องกลางของทุกการ์ด** (`COMMON_SETTINGS` ใน `registry.js`, `group: 'common'`) ต่อท้ายช่องของ Widget อัตโนมัติ: ชื่อการ์ด (แยกภาษา `title_th`/`title_en`) · แสดงชื่อ · แสดงปุ่มลิงก์คู่มือ · สีพื้น `bg_color` · สีตัวอักษร `text_color` · สีเน้น `accent_color` (โค้ดสี #RRGGBB) — ว่าง = ค่าเริ่มต้น
- สีพื้นจากโค้ดสี: เลือกชุดตัวอักษรตามความต่างของสี (WCAG) — พื้นเข้มใช้ `lp-tone-dark` · พื้นอ่อนใช้ `lp-tone-custom` (สไตล์พื้นฐาน ไม่ใช้สีเน้นของการ์ดขาว)
- สีเน้นส่งเป็นตัวแปร `--w-accent` — Widget ใช้ `var(--w-accent, สีเดิม)` กับตัวเลข/แท่งกราฟ/สถานะเด่น
- ช่องเฉพาะการ์ด: เปิด/ปิดแต่ละส่วนในการ์ด (`show_*`) และค่าของการ์ดนั้น · ช่อง `localized: true` = เก็บแยกภาษา
- ⚠️ ไม่มีช่องซ่อนป้าย "ตัวอย่าง"/"ข้อมูลจริง" โดยตั้งใจ · ชื่อที่ซ่อนยังอยู่ในหน้า (`lp-sr-only`) ให้โปรแกรมอ่านหน้าจอ/Google อ่านได้
- Widget ใหม่: ทุกช่องต้องมี `default` (มีเทสตรวจ)

## ตาราง

| จอ | คอลัมน์ | ความสูง |
|---|---|---|
| ≥ 1024px | 4 | แถวละ 190px |
| 640–1023px | 2 (`3x1` `4x1` กว้าง 2) | แถวละ 190px |
| < 640px | 1 | ตามเนื้อหา · การ์ดที่ `mobile: false` ถูกซ่อน |

## กติกา

- ลิงก์ทุกจุดใช้ `base` (= `req.baseUrl`) ห้ามเขียน `/v2` ตายตัว
- ระหว่างอยู่ที่ `/v2` ส่ง `noindex` (หัว `X-Robots-Tag` + meta) อัตโนมัติ
- ข้อมูลจริงจาก Lullapos (ภายหลัง): บัญชีฐานข้อมูลอ่านอย่างเดียว · ยอดรวมทั้งระบบเท่านั้น ห้ามระบุร้าน · เก็บผลชั่วคราว · พังแล้วกลับไปใช้ข้อมูลตัวอย่าง
- **ย้าย `/v2` มาเป็นหน้าแรก `/` เฉพาะเมื่อเจ้าของบอกว่า v2 เสร็จและพร้อมย้าย** — ขั้นตอน: ต่อแอปที่ `/` แทน `/v2` · ถอดเส้นทาง/หลังบ้านเก่า · 301 จาก `/v2/*` และ URL หน้า/บทความเดิม · เปิด sitemap/robots · ลบตาราง `landing_*` ทีหลัง (สำรองก่อน เจ้าของรันเอง)

## ตั้งค่าเว็บไซต์ + SEO / AI SEO

`site-settings.js` (ช่องตั้งค่า `FIELDS` + ค่าตั้งต้น `DEFAULT_SITE`) → `seo.js` สร้างของทั้งหมดด้านล่าง · หน้า Admin อ่านช่องตั้งค่าจาก `/api/site-settings.json`

| กลุ่ม | ช่อง |
|---|---|
| brand | โลโก้ ความสูงโลโก้ favicon (SVG/PNG ≥512) apple-touch-icon (180 พื้นทึบ) สีธีม · สีพื้นหลังหน้าเว็บ `page_bg_color` (สีเข้ม = ตัวหนังสือนอกการ์ดเป็นสีอ่อน `lp-page-dark`) |
| texts (th/en) | ชื่อเว็บ title description ย่อหน้า "Lullapos คืออะไร" ข้อความแทนรูปแชร์ — ภาษาอังกฤษว่าง = ใช้ไทย |
| share | รูปแชร์ 1200×630 แยกไทย/อังกฤษ |
| social / contact | LINE Facebook YouTube TikTok Instagram X · อีเมล โทร |
| verification | Google Search Console · Bing Webmaster |
| robots | `allow_ai` ให้บอท AI อ่านเว็บได้ (ค่าตั้งต้น = ได้) |

สิ่งที่หน้าเว็บส่งออก:

- `<head>`: title, description, robots, canonical, hreflang th/en/x-default, theme-color, favicon/apple-touch/manifest, OpenGraph (รูป ขนาด alt locale), Twitter card, meta ยืนยันเจ้าของเว็บ (เฉพาะที่ตั้งไว้)
- JSON-LD: `Organization` (โลโก้ sameAs ช่องทางติดต่อ) · `WebSite` · `WebPage` · `SoftwareApplication` (featureList จากทะเบียน Widget) — **ห้ามเพิ่มคะแนนรีวิว ราคา หรือตัวเลขที่ไม่จริง**
- `/robots.txt` (ที่ /v2 = Disallow ทั้งหมด), `/sitemap.xml` (มี hreflang), `/llms.txt` (สรุปเว็บให้ AI ตาม llmstxt.org), `/site.webmanifest`, `/favicon.ico` (301 ไปรูปจริง)
- ย่อหน้า "Lullapos คืออะไร" เป็นข้อความจริงในหน้า ไม่ใช่รูป — ช่วยให้ Google และ AI สรุปถูก
- URL ใน canonical/og/sitemap ใช้ `SITE_URL` (ค่าตั้งต้น `https://lullapos.com`) + base

ไฟล์ใน `public/brand/`: `logo.png` (โลโก้จริงจาก pos-free-app) · `icon.svg` + PNG 32/48/192/512 + `apple-touch-icon.png` (ไอคอนตัว L ชั่วคราว จนกว่าจะอัปโหลด favicon จริงในหน้า Admin) · `og-th.png` / `og-en.png`

## ต่อกับหน้า Admin (pos-free-app เมนู "Marketing web")

- pos-free-app สร้าง/เขียนตาราง `lp_site` (แถวเดียว: `draft`, `published` = `{ site, layout }`, `preview_token`, `preview_expires_at`) — เอกสาร `docs/knowledge/MARKETING_WEB.md` ใน repo นั้น
- `v2/db.js` อ่านอย่างเดียว: แถว `published` แคช 60 วินาที ใช้ร่วมกันทั้งการ์ดและตั้งค่าเว็บไซต์ · อ่านพลาด/ยังไม่มีตาราง = ค่าที่อ่านได้ครั้งล่าสุด หรือค่าตั้งต้นในโค้ด
- `V2_DATABASE_URL` = บัญชีฐานข้อมูลอ่านอย่างเดียว (แนะนำ) · ไม่ตั้ง = ใช้ pool เดิมของ `server.js`
- หน้าดูตัวอย่างฉบับร่าง `/preview?token=` และ `/en/preview?token=` — รหัสจากหน้า Admin อายุ 2 ชั่วโมง · มีแถบ "ตัวอย่างฉบับร่าง" · `noindex` + `no-store` · รหัสผิด/หมดอายุ = 403
- หน้า Admin อ่าน `/api/widgets.json` (+ `defaultLayout`) และ `/api/site-settings.json` ไปสร้างฟอร์ม — เพิ่ม Widget/ช่องตั้งค่าที่นี่ หน้า Admin เห็นเอง
- วันย้ายมาที่ `/`: ฝั่ง pos-free-app ต้องเปลี่ยน `MARKETING_WEB_URL` เป็น `https://lullapos.com` ด้วย

## การ์ดข้อมูลจริง

- สถิติมาจาก pos-free-app `GET /api/public/marketing-web/stats` ผ่าน `v2/stats.js` (แคช 10 นาที ดึงพร้อมกันครั้งเดียว ดึงไม่ได้ = ค่าล่าสุด) · `APP_BASE_URL` ค่าตั้งต้น `https://app.lullapos.com`
- Widget รับ `stats` ใน `getData` เฉพาะเมื่อการ์ดตั้งเป็น `live` · คืน `data.source` = `'live'`/`'mock'` เพื่อให้ป้ายบนการ์ดตรงกับตัวเลขที่แสดง · คืน `{ hidden: true }` = ซ่อนการ์ด
- `feature: false` ในข้อมูลประจำตัว = เป็นสถิติ ไม่ใส่ใน featureList (JSON-LD) และ llms.txt
- ตัวเลขสถิติใช้ `v2/format.js` (ปัดลงเสมอ) · ตัวเลขนับขึ้นใส่ `data-format` · สูตรฝั่งเบราว์เซอร์อยู่ใน `public/js/v2.js` มีเทสเทียบให้ตรงกัน
- `bills-total`: บิลทุกระบบ · ตัวเลขสมมุติ 8,950 (`mock-data.js` `mockDaily()` รายวัน 800 วัน รวมได้ 8,950 พอดี) เมื่อไม่มีข้อมูล/ต่ำกว่าเกณฑ์ พร้อมป้าย "ตัวอย่าง"
  - ช่วงเวลา (เจ้าของสั่ง 2026-11-22): ทั้งหมด / ปีนี้ / ปีที่แล้ว / กำหนดเอง (ช่องวันที่ `type: 'date'` + `showIf`) — คิดจากชุดรายวันตามเวลาไทย (`v2/series.js`) · บรรทัดบอกช่วงเวลาซ่อนไม่ได้
  - กราฟ SVG วาดเอง (`v2/chart.js`): แท่ง / เส้น / พื้นที่ · ช่วง ≤ 62 วัน = รายวัน · ≤ ~3 ปี = รายเดือน · ยาวกว่า = รายปี
  - ตำแหน่งกราฟ: อัตโนมัติ (1x1 = เฉพาะตัวเลข · 2x2/1x2 = ล่าง · การ์ดกว้าง = ขวา) / ซ้าย / ขวา / บน / ล่าง / เฉพาะตัวเลข / เฉพาะกราฟ · การ์ดสูง 1 แถวที่มีกราฟ เหลือตัวเลข + ช่วงเวลา · มือถือ กราฟซ้าย/ขวาย้ายลงล่าง
- ชนิดช่องตั้งค่า: `text select boolean number color date` · `showIf: { key, value }` = แสดงช่องเฉพาะเมื่ออีกช่องเป็นค่านั้น (หน้า Admin)
- ⚠️ ห้ามคูณ/แต่งตัวเลขจริง (เจ้าของตกลง 2026-11-22)

## ยังไม่ได้ทำ

- favicon สำรองจาก `site_settings.favicon_url` ของ pos-free-app
- หน้าดูตัวอย่างฉบับร่างสำหรับฝังในหน้า Admin
- Widget ข้อมูลจริงตัวแรก
