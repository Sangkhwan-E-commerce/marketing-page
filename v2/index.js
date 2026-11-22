// 🌟 เว็บหน้าแรก v2 — แอปย่อยของ Express ที่ server.js ต่อไว้ที่ /v2 (เว็บเก่าที่ / ยังทำงานเหมือนเดิม)
//    ⚠️ ลิงก์ทุกจุดใช้ req.baseUrl ห้ามเขียน "/v2" ตายตัว — วันย้ายมาหน้าแรก แค่เปลี่ยนจุดที่ต่อแอปใน server.js
//    ⚠️ ย้าย /v2 → / เฉพาะเมื่อเจ้าของบอกว่า v2 เสร็จและพร้อมย้ายเท่านั้น
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { loadWidgets, describeWidgets, SIZES } = require('./registry');
const { createLayoutSource, normalizeLayout, DEFAULT_LAYOUT } = require('./layout');
const { createSiteSource, normalizeSiteSettings, FIELDS: SITE_FIELDS, DEFAULT_SITE } = require('./site-settings');
const { buildHead, buildRobotsTxt, buildSitemap, buildLlmsTxt, buildManifest, localAsset } = require('./seo');
const { LOCALES, DEFAULT_LOCALE, createT, formatNumber } = require('./i18n');
const mock = require('./mock-data');

const DEFAULT_APP_URL = 'https://app.lullapos.com';
const DEFAULT_SITE_URL = 'https://lullapos.com';
// สีพื้นการ์ดที่กรอบกลางรองรับ — Widget ตั้ง tone ในตัวเอง หรือเปิดช่องตั้งค่า tone ให้หน้า Admin เลือก
const TONES = ['light', 'dark', 'blue', 'green', 'orange'];

const trimSlash = url => url.replace(/\/+$/, '');

function bundle(files) {
    return files.filter(Boolean).map(file => `/* ${path.basename(path.dirname(file))} */\n${fs.readFileSync(file, 'utf8')}`).join('\n');
}

function createV2App({
    widgets = loadWidgets(),
    loadPublished = null,       // รายการการ์ดที่เผยแพร่ (จากหน้า Admin) — null = DEFAULT_LAYOUT
    loadSiteSettings = null,    // ตั้งค่าเว็บไซต์ที่เผยแพร่ — null = DEFAULT_SITE
    loadDraft = null,           // (token) => ฉบับร่าง { site, layout } สำหรับหน้าดูตัวอย่าง — null = ไม่มีหน้าดูตัวอย่าง
    loadStats = null,           // () => สถิติจริง { bills_total } (v2/stats.js) — null = การ์ดข้อมูลจริงใช้ตัวอย่าง
    siteCacheMs = 60000,        // แคชตั้งค่าเว็บไซต์ · ตั้ง 0 เมื่อตัวอ่านแคชเองแล้ว (v2/db.js)
    appUrl = trimSlash(process.env.APP_BASE_URL || DEFAULT_APP_URL),
    siteUrl = trimSlash(process.env.SITE_URL || DEFAULT_SITE_URL),
    production = process.env.NODE_ENV === 'production',
    logger = console
} = {}) {
    const app = express();
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');
    if (production) app.enable('view cache');

    const getLayout = createLayoutSource({ widgets, loadPublished, logger });
    const getSite = createSiteSource({ loadPublished: loadSiteSettings, cacheMs: siteCacheMs, logger });
    const list = [...widgets.values()];
    const widgetCss = bundle(list.map(w => w.stylePath));
    const widgetJs = bundle(list.map(w => w.scriptPath));
    const assetMaxAge = production ? '1h' : 0;
    const cacheHeader = `public, max-age=${production ? 3600 : 0}`;

    // ความสามารถของระบบจากทะเบียน Widget — ใช้ใน JSON-LD และ llms.txt
    const features = list.filter(w => w.feature !== false).map(w => ({
        name: { th: w.text.th.name, en: w.text.en.name },
        description: { th: w.text.th.description || '', en: w.text.en.description || '' },
        docUrl: w.docPath ? `${appUrl}${w.docPath}` : null
    }));

    // ระหว่างพัฒนาที่ /v2 ห้าม Google เก็บหน้า — อันดับของเว็บเก่าที่ / จะได้ไม่กระทบ
    app.use((req, res, next) => {
        res.locals.base = req.baseUrl;
        res.locals.noindex = req.baseUrl !== '';
        res.locals.ctx = { base: req.baseUrl, siteUrl, appUrl, noindex: res.locals.noindex };
        if (res.locals.noindex) res.set('X-Robots-Tag', 'noindex, nofollow');
        next();
    });

    app.use('/assets', express.static(path.join(__dirname, 'public'), { maxAge: assetMaxAge, index: false }));
    app.get('/assets/widgets.css', (req, res) => res.type('text/css').set('Cache-Control', cacheHeader).send(widgetCss));
    app.get('/assets/widgets.js', (req, res) => res.type('application/javascript').set('Cache-Control', cacheHeader).send(widgetJs));

    // ไฟล์มาตรฐานของเว็บ — มีผลจริงเมื่อย้ายมาที่ราก (/) แล้ว ระหว่างอยู่ที่ /v2 ตอบไว้ให้ทดสอบได้
    app.get('/robots.txt', async (req, res, next) => {
        try { res.type('text/plain').set('Cache-Control', cacheHeader).send(buildRobotsTxt(res.locals.ctx, await getSite())); } catch (err) { next(err); }
    });
    app.get('/sitemap.xml', (req, res) => res.type('application/xml').set('Cache-Control', cacheHeader).send(buildSitemap(res.locals.ctx)));
    app.get('/llms.txt', async (req, res, next) => {
        try { res.type('text/plain').set('Cache-Control', cacheHeader).send(buildLlmsTxt(res.locals.ctx, { site: await getSite(), features })); } catch (err) { next(err); }
    });
    app.get('/site.webmanifest', async (req, res, next) => {
        try { res.type('application/manifest+json').set('Cache-Control', cacheHeader).send(JSON.stringify(buildManifest(res.locals.ctx, await getSite()))); } catch (err) { next(err); }
    });
    app.get('/favicon.ico', async (req, res, next) => {
        try {
            const site = await getSite();
            res.redirect(301, localAsset(res.locals.ctx, site.brand.favicon_url.startsWith('/assets/brand/') ? '/assets/brand/icon-48.png' : site.brand.favicon_url));
        } catch (err) { next(err); }
    });

    // สำหรับหน้า Admin "Marketing web" ใน pos-free-app — อ่านไปสร้างฟอร์มตั้งค่า
    app.get('/api/widgets.json', (req, res) => {
        res.set('Cache-Control', 'no-store').json({ version: 1, sizes: SIZES, locales: LOCALES, widgets: describeWidgets(widgets), defaultLayout: DEFAULT_LAYOUT });
    });
    app.get('/api/site-settings.json', (req, res) => {
        res.set('Cache-Control', 'no-store').json({ version: 1, locales: LOCALES, fields: SITE_FIELDS, defaults: DEFAULT_SITE });
    });

    async function renderCard(entry, locale) {
        const { widget } = entry;
        const text = widget.text[locale] || widget.text[DEFAULT_LOCALE];
        const stats = entry.source === 'live' && loadStats ? await loadStats() : null;
        const data = await widget.getData({ mock, locale, settings: entry.settings, source: entry.source, size: entry.size, stats });
        if (data && data.hidden) return null; // การ์ดขอซ่อนตัวเอง (เช่น ข้อมูลจริงยังไม่ถึงเกณฑ์)
        // การ์ดข้อมูลจริงที่ต้องถอยไปใช้ตัวอย่าง บอกผ่าน data.source → ป้ายบนการ์ดตรงกับตัวเลขที่แสดงเสมอ
        const source = data && (data.source === 'live' || data.source === 'mock') ? data.source : entry.source;
        const html = await ejs.renderFile(widget.viewPath, {
            data, text, locale, settings: entry.settings, size: entry.size,
            fmt: (value, options) => formatNumber(value, locale, options),
            pick: obj => (obj && typeof obj === 'object' ? (obj[locale] ?? obj[DEFAULT_LOCALE]) : obj)
        }, { cache: production, filename: widget.viewPath });
        return {
            key: entry.key,
            id: widget.id,
            size: entry.size,
            source,
            mobile: entry.mobile,
            header: widget.header !== false,
            tone: TONES.includes(entry.settings.tone) ? entry.settings.tone : (widget.tone || 'light'),
            name: text.name,
            docUrl: widget.docPath ? `${appUrl}${widget.docPath}` : null,
            html
        };
    }

    // preview = ฉบับร่างจากหน้า Admin (ไม่ผ่านแคช ห้ามบอทเก็บ)
    async function renderHome(req, res, next, locale, preview = null) {
        try {
            let layout;
            let site;
            if (preview) {
                layout = normalizeLayout(preview.layout, widgets);
                if (!layout.length) layout = normalizeLayout(DEFAULT_LAYOUT, widgets);
                site = normalizeSiteSettings(preview.site);
            } else {
                [layout, site] = await Promise.all([getLayout(), getSite()]);
            }
            const cards = [];
            for (const entry of layout) {
                try {
                    const card = await renderCard(entry, locale);
                    if (card) cards.push(card);
                } catch (err) {
                    // การ์ดใบเดียวพังต้องไม่ทำให้ทั้งหน้าพัง — ข้ามใบนั้นแล้วจดไว้
                    logger.error(`[v2] widget "${entry.widget.id}" failed:`, err.message);
                }
            }
            const { ctx, base } = res.locals;
            const thUrl = base || '/';
            const enUrl = `${base}/en`;
            const localFeatures = features.map(f => ({ name: f.name[locale], description: f.description[locale] }));
            res.render('page', {
                locale,
                t: createT(locale),
                cards,
                appUrl,
                site,
                texts: site.texts[locale],
                head: buildHead(ctx, { site, locale, features: localFeatures }),
                logo: localAsset(ctx, site.brand.logo_url),
                selfUrl: preview ? res.locals.previewLinks[locale] : (locale === 'th' ? thUrl : enUrl),
                altUrl: preview ? res.locals.previewLinks[locale === 'th' ? 'en' : 'th'] : (locale === 'th' ? enUrl : thUrl),
                altLocale: locale === 'th' ? 'en' : 'th',
                year: new Date().getFullYear(),
                preview: !!preview
            });
        } catch (err) { next(err); }
    }

    app.get('/', (req, res, next) => renderHome(req, res, next, 'th'));
    app.get('/en', (req, res, next) => renderHome(req, res, next, 'en'));

    // หน้าดูตัวอย่างฉบับร่าง — รหัสชั่วคราวจากหน้า Admin (pos-free-app) อายุ 2 ชั่วโมง
    async function renderPreview(req, res, next, locale) {
        try {
            res.set('Cache-Control', 'no-store').set('X-Robots-Tag', 'noindex, nofollow');
            const draft = loadDraft ? await loadDraft(req.query.token) : null;
            if (!draft) return res.status(403).type('text/plain; charset=utf-8').send(createT(locale)('preview.expired'));
            res.locals.ctx = { ...res.locals.ctx, noindex: true };
            res.locals.noindex = true;
            const q = '?token=' + encodeURIComponent(req.query.token);
            res.locals.previewLinks = { th: res.locals.base + '/preview' + q, en: res.locals.base + '/en/preview' + q };
            return renderHome(req, res, next, locale, draft);
        } catch (err) { next(err); }
    }
    app.get('/preview', (req, res, next) => renderPreview(req, res, next, 'th'));
    app.get('/en/preview', (req, res, next) => renderPreview(req, res, next, 'en'));

    return app;
}

module.exports = { createV2App };
