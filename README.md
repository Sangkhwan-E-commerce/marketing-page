# ShopPOS — เว็บไซต์แนะนำระบบ POS ฟรี

โครงสร้างโปรเจกต์ Node.js + Express + Tailwind CSS + Heroicons (inline SVG)

## โครงสร้างไฟล์

```
pos-saas-website/
├── server.js            # Express server
├── views/
│   └── index.html       # หน้าแรก (Tailwind classes + Heroicons)
├── src/
│   └── input.css        # Tailwind directives
├── public/
│   └── css/output.css   # ไฟล์ CSS ที่ build แล้ว (ห้ามแก้ตรงนี้)
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## วิธีใช้งาน

ติดตั้ง dependencies (ครั้งแรกครั้งเดียว):
```
npm install
```

โหมดพัฒนา (build CSS อัตโนมัติเมื่อแก้ไฟล์ + รันเซิร์ฟเวอร์):
```
npm run dev
```

โหมดโปรดักชัน (build CSS ครั้งเดียวแล้วรันเซิร์ฟเวอร์):
```
npm start
```

เปิดดูที่ http://localhost:3000

## Deploy บน Render.com (ผ่าน GitHub)

ไม่ต้องติดตั้ง Node.js บนเครื่องตัวเอง แค่ push โค้ดขึ้น GitHub แล้วตั้งค่าใน Render ดังนี้:

1. สร้าง **New → Web Service** บน Render แล้วเชื่อมกับ repo GitHub นี้
2. ตั้งค่า:
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. Render จะ set ตัวแปร `PORT` ให้เองอัตโนมัติ (โค้ดใน `server.js` อ่านจาก `process.env.PORT` อยู่แล้ว ไม่ต้องแก้อะไร)
4. กด **Create Web Service** — Render จะ build และรันให้อัตโนมัติทุกครั้งที่ push โค้ดใหม่ขึ้น GitHub

**สำคัญ:** ไฟล์ `public/css/output.css` ถูก generate ขึ้นตอน build (ไม่ต้อง commit ขึ้น GitHub เพราะอยู่ใน `.gitignore` แล้ว) ระบบจะ build ให้ใหม่ทุกครั้งบน Render เอง ดังนั้น `tailwindcss`, `postcss`, `autoprefixer` ต้องอยู่ใน `dependencies` (ไม่ใช่ `devDependencies`) เพราะ Render รัน `npm install` แบบ production ซึ่งจะข้าม devDependencies ไป — ไฟล์นี้จัดไว้ให้ถูกต้องแล้ว

## ระบบ Admin (/admin)

หน้าจัดการรูปภาพหน้าเว็บ ใช้ล็อกอินด้วยอีเมล/รหัสผ่านที่ตั้งไว้ใน Environment Variables รูปที่อัปโหลดจะถูกเก็บไว้บน Cloudflare R2 (ไม่ใช่ดิสก์ของ Render) จึงไม่หายเมื่อ redeploy หรือ restart service

**Environment Variables ที่ต้องตั้งบน Render:**

| ตัวแปร | คำอธิบาย |
|---|---|
| `ADMIN_EMAIL` | อีเมลสำหรับล็อกอินหน้า /admin |
| `ADMIN_PASSWORD` | รหัสผ่านสำหรับล็อกอินหน้า /admin |
| `SESSION_SECRET` | ข้อความสุ่มยาวๆ ใช้เข้ารหัส session (ถ้าไม่ตั้งจะสุ่มให้เอง แต่จะถูกเด้งออกทุกครั้งที่ restart) |
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 API Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret Access Key |
| `R2_BUCKET_NAME` | ชื่อ R2 bucket (ใช้ร่วมกับ webservice อื่นได้) |
| `R2_PUBLIC_URL` | Public URL/custom domain ของ bucket (ไม่ต้องมี `/` ปิดท้าย) |
| `R2_PREFIX` | (ไม่บังคับ) โฟลเดอร์แยกภายใน bucket ค่าเริ่มต้นคือ `lullapos/` |

**วิธีใช้งาน:**
1. เข้า `https://lullapos.com/admin` → ล็อกอินด้วย `ADMIN_EMAIL` / `ADMIN_PASSWORD`
2. อัปโหลดรูปสำหรับแต่ละตำแหน่ง (Hero, ภาพประกอบ "ทำไมต้องฟรี")
3. รูปจะไปแทนที่กล่องตัวอย่างในหน้าแรกทันที ไม่ต้อง deploy ใหม่
4. กด "ลบรูปนี้" เพื่อกลับไปใช้กล่องตัวอย่างเริ่มต้น

รูปทั้งหมดถูกเก็บไว้ใต้ prefix `lullapos/` ใน bucket R2 ที่ระบุ พร้อมไฟล์ `lullapos/meta.json` ที่บอกว่าแต่ละตำแหน่งใช้รูปไหนอยู่

## หมายเหตุ

- ไอคอนทั้งหมดใช้ Heroicons (outline, 24px) แบบ inline SVG ในไฟล์ HTML โดยตรง ไม่ต้องพึ่ง CDN ภายนอก
- สีหลักของแบรนด์ (`brand-*`) กำหนดไว้ใน `tailwind.config.js` ปรับได้ตามต้องการ
- ถ้าจะเพิ่มหน้าใหม่ ให้สร้างไฟล์ .html ในโฟลเดอร์ `views/` แล้วเพิ่ม route ใน `server.js`
