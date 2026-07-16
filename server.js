const express = require("express");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const multer = require("multer");
const { getMeta, uploadSlotImage, clearSlotImage } = require("./lib/r2");

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.warn("Warning: ADMIN_EMAIL / ADMIN_PASSWORD is not set — /admin login will always fail.");
}
if (!SESSION_SECRET) {
  console.warn("Warning: SESSION_SECRET is not set — using a random secret, sessions won't survive a restart.");
}

app.use("/css", express.static(path.join(__dirname, "public/css")));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: SESSION_SECRET || require("crypto").randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("รองรับเฉพาะไฟล์ JPG, PNG, WebP เท่านั้น"), ok);
  },
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect("/admin/login");
}

// ---------- Public homepage ----------
app.get("/", async (req, res) => {
  try {
    let html = fs.readFileSync(path.join(__dirname, "views/index.html"), "utf-8");
    const meta = await getMeta().catch(() => ({}));

    const slotImageBlock = (url, alt) => `
      <div class="mt-10 rounded-xl overflow-hidden border border-gray-100">
        <img src="${url}" alt="${alt}" class="w-full h-64 object-cover">
      </div>`;

    if (meta.hero) {
      html = html.replace(
        /<!-- SLOT:hero:START -->[\s\S]*?<!-- SLOT:hero:END -->/,
        slotImageBlock(meta.hero, "ภาพหน้าจอระบบ POS").replace("h-64", "h-64")
      );
    }
    if (meta.whyFree) {
      html = html.replace(
        /<!-- SLOT:whyFree:START -->[\s\S]*?<!-- SLOT:whyFree:END -->/,
        `<div class="rounded-xl overflow-hidden border border-gray-100 h-56">
          <img src="${meta.whyFree}" alt="ภาพประกอบใช้งานหลายอุปกรณ์" class="w-full h-full object-cover">
        </div>`
      );
    }

    res.send(html);
  } catch (err) {
    console.error(err);
    res.sendFile(path.join(__dirname, "views/index.html"));
  }
});

// ---------- Admin auth ----------
app.get("/admin/login", (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect("/admin");
  const html = fs
    .readFileSync(path.join(__dirname, "views/admin-login.html"), "utf-8")
    .replace("{{ERROR_BLOCK}}", "");
  res.send(html);
});

app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (
    ADMIN_EMAIL &&
    ADMIN_PASSWORD &&
    email === ADMIN_EMAIL &&
    password === ADMIN_PASSWORD
  ) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }
  const errorBlock = `<div class="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">อีเมลหรือรหัสผ่านไม่ถูกต้อง</div>`;
  const html = fs
    .readFileSync(path.join(__dirname, "views/admin-login.html"), "utf-8")
    .replace("{{ERROR_BLOCK}}", errorBlock);
  res.status(401).send(html);
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

// ---------- Admin panel ----------
app.get("/admin", requireAdmin, async (req, res) => {
  res.send(await renderAdminPanel());
});

app.post("/admin/upload", requireAdmin, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      return res.send(await renderAdminPanel(`อัปโหลดไม่สำเร็จ: ${err.message}`, true));
    }
    const slot = req.body.slot;
    if (!["hero", "whyFree"].includes(slot)) {
      return res.send(await renderAdminPanel("ตำแหน่งรูปไม่ถูกต้อง", true));
    }
    if (!req.file) {
      return res.send(await renderAdminPanel("กรุณาเลือกไฟล์รูปภาพ", true));
    }
    try {
      await uploadSlotImage(slot, req.file.buffer, req.file.mimetype, req.file.originalname);
      res.send(await renderAdminPanel("อัปโหลดรูปสำเร็จ"));
    } catch (e) {
      console.error(e);
      res.send(await renderAdminPanel(`อัปโหลดไม่สำเร็จ: ${e.message}`, true));
    }
  });
});

app.post("/admin/remove", requireAdmin, async (req, res) => {
  const slot = req.body.slot;
  if (!["hero", "whyFree"].includes(slot)) {
    return res.send(await renderAdminPanel("ตำแหน่งรูปไม่ถูกต้อง", true));
  }
  try {
    await clearSlotImage(slot);
    res.send(await renderAdminPanel("ลบรูปแล้ว กลับไปใช้ภาพตัวอย่างเริ่มต้น"));
  } catch (e) {
    console.error(e);
    res.send(await renderAdminPanel(`ลบไม่สำเร็จ: ${e.message}`, true));
  }
});

async function renderAdminPanel(message, isError) {
  let html = fs.readFileSync(path.join(__dirname, "views/admin-panel.html"), "utf-8");
  let meta = {};
  try {
    meta = await getMeta();
  } catch (e) {
    message = message || `เชื่อมต่อ R2 ไม่ได้: ${e.message}`;
    isError = true;
  }

  const flash = message
    ? `<div class="mb-6 text-sm ${isError ? "text-red-600 bg-red-50 border-red-100" : "text-green-700 bg-green-50 border-green-100"} border rounded-md px-3 py-2">${message}</div>`
    : "";

  const preview = (url) =>
    url
      ? `<div class="mb-4"><img src="${url}" class="h-32 rounded-md border border-gray-100 object-cover"></div>`
      : `<div class="mb-4 text-xs text-gray-400">ยังไม่มีรูป — ใช้ภาพตัวอย่างเริ่มต้นอยู่</div>`;

  const removeForm = (slot, url) =>
    url
      ? `<form method="POST" action="/admin/remove" class="mt-3">
          <input type="hidden" name="slot" value="${slot}">
          <button class="text-xs text-red-600 hover:underline">ลบรูปนี้ (กลับไปใช้ภาพตัวอย่าง)</button>
        </form>`
      : "";

  html = html
    .replace("{{FLASH_BLOCK}}", flash)
    .replace("{{HERO_PREVIEW}}", preview(meta.hero))
    .replace("{{HERO_REMOVE_FORM}}", removeForm("hero", meta.hero))
    .replace("{{WHYFREE_PREVIEW}}", preview(meta.whyFree))
    .replace("{{WHYFREE_REMOVE_FORM}}", removeForm("whyFree", meta.whyFree));

  return html;
}

app.listen(PORT, () => {
  console.log(`ShopPOS website running at http://localhost:${PORT}`);
});
