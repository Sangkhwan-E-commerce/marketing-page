const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { loadWidgets, validateManifest, resolveSettings, describeWidgets, SIZES } = require('../v2/registry');
const { normalizeLayout, DEFAULT_LAYOUT } = require('../v2/layout');
const { createV2App } = require('../v2');

const widgets = loadWidgets();
const silent = { error() {} };

async function withServer(mountPath, options, run) {
    const app = express();
    app.use(mountPath, createV2App({ logger: silent, ...options }));
    app.use((req, res) => res.status(404).send('old-site-404'));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    try { await run(base); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('registry loads every widget folder with a valid manifest', () => {
    assert.ok(widgets.size >= 3);
    for (const id of ['sales-today', 'kitchen-orders', 'stock-expiry']) assert.ok(widgets.has(id), id);
    for (const w of widgets.values()) {
        assert.ok(w.sizes.every(size => SIZES.includes(size)));
        assert.ok(w.text.th.name && w.text.en.name);
    }
});

test('registry rejects a broken manifest', () => {
    const good = { id: 'demo', sizes: ['1x1'], defaultSize: '1x1', dataSources: ['mock'], getData() {}, text: { th: { name: 'ก' }, en: { name: 'a' } } };
    assert.doesNotThrow(() => validateManifest(good, 'demo'));
    assert.throws(() => validateManifest(good, 'other-folder'), /folder name/);
    assert.throws(() => validateManifest({ ...good, sizes: ['3x3'], defaultSize: '3x3' }, 'demo'), /unknown size/);
    assert.throws(() => validateManifest({ ...good, defaultSize: '2x2' }, 'demo'), /defaultSize/);
    assert.throws(() => validateManifest({ ...good, dataSources: ['db'] }, 'demo'), /data source/);
    assert.throws(() => validateManifest({ ...good, text: { th: { name: 'ก' } } }, 'demo'), /text\.en/);
});

test('layout drops unknown widgets and falls back to supported size/source', () => {
    const layout = normalizeLayout([
        { widget: 'no-such-widget', size: '1x1' },
        { widget: 'sales-today', size: '1x1', source: 'live' },
        { widget: 'stock-expiry', size: '2x1', mobile: false },
        { widget: 'kitchen-orders', enabled: false }
    ], widgets);
    assert.equal(layout.length, 2);
    assert.equal(layout[0].size, widgets.get('sales-today').defaultSize);
    assert.equal(layout[0].source, 'mock');
    assert.equal(layout[1].size, '2x1');
    assert.equal(layout[1].mobile, false);
    assert.equal(normalizeLayout(DEFAULT_LAYOUT, widgets).length, DEFAULT_LAYOUT.length);
});

test('settings keep only known keys with valid values', () => {
    const w = widgets.get('sales-today');
    const defaults = resolveSettings(w, {});
    assert.equal(defaults.tone, 'light');
    assert.equal(defaults.showPayments, true);
    const bad = resolveSettings(w, { tone: 'purple', showPayments: 'yes', extra: 1, bg_color: 'red', accent_color: '#12345', title_th: 5 });
    assert.deepEqual(bad, defaults, 'invalid values fall back to defaults');
    assert.ok(!('extra' in bad));
    const good = resolveSettings(w, { tone: 'dark', showPayments: false, bg_color: '#FACC15', title_th: '  ยอดวันนี้  ', title_en: 'Today' });
    assert.equal(good.tone, 'dark');
    assert.equal(good.showPayments, false);
    assert.equal(good.bg_color, '#facc15');
    assert.equal(good.title_th, 'ยอดวันนี้');
    assert.equal(good.title_en, 'Today');
});

test('every widget gets the shared card settings, after its own, and every setting has a default', () => {
    for (const w of widgets.values()) {
        const keys = w.settings.map(s => s.key);
        assert.deepEqual(keys.slice(-6), ['title', 'show_title', 'show_doc_link', 'bg_color', 'text_color', 'accent_color'], w.id);
        for (const s of w.settings) assert.ok('default' in s, `${w.id}.${s.key} has a default`);
        assert.ok(!keys.some(k => /badge/.test(k)), 'the sample/live badge can never be hidden');
    }
    const described = describeWidgets(widgets).find(w => w.id === 'bills-total');
    assert.ok(described.settings.find(s => s.key === 'title').localized);
    assert.equal(described.settings.find(s => s.key === 'bg_color').group, 'common');
    assert.equal(described.settings.find(s => s.key === 'format').group, 'widget');
});

test('card shell applies colour codes, custom titles and hides title/manual link on request', async () => {
    const layout = [{ widget: 'stock-expiry', settings: { bg_color: '#0F172A', accent_color: '#22c55e', title_th: 'ของใกล้หมดอายุ', show_doc_link: false } },
        { widget: 'sales-today', settings: { bg_color: '#facc15', show_title: false, text_color: '#111111' } }];
    await withServer('/v2', { loadPublished: async () => layout }, async base => {
        const html = await (await fetch(`${base}/v2`)).text();
        const exp = /<article[^>]*data-widget="stock-expiry"[\s\S]*?<\/article>/.exec(html)[0];
        assert.match(exp, /class="lp-card lp-tone-dark /, 'dark colour → light text set');
        assert.match(exp, /style="background-color: #0f172a; --w-accent: #22c55e"/);
        assert.match(exp, /<h2 class="lp-card-title">ของใกล้หมดอายุ<\/h2>/);
        assert.ok(!exp.includes('lp-card-arrow'), 'manual link hidden');
        assert.match(exp, /class="lp-badge"/, 'sample badge stays');
        const sales = /<article[^>]*data-widget="sales-today"[\s\S]*?<\/article>/.exec(html)[0];
        assert.match(sales, /class="lp-card lp-tone-custom /, 'light colour → dark text, no white-card accents');
        assert.match(sales, /style="background-color: #facc15; color: #111111"/);
        assert.match(sales, /lp-card-title lp-sr-only/, 'title hidden visually but still in the page');
        const en = await (await fetch(`${base}/v2/en`)).text();
        assert.match(en, /<h2 class="lp-card-title">Expiring lots<\/h2>/, 'no English title set → the card’s own English name');
    });
});

test('widget description for the admin has no functions or local paths', () => {
    const json = JSON.stringify(describeWidgets(widgets));
    assert.ok(!json.includes('getData'));
    assert.ok(!/[A-Za-z]:\\\\|\/Users\//.test(json));
});

test('/v2 renders Thai and English pages, noindex, sample badges, no external assets', async () => {
    await withServer('/v2', {}, async base => {
        const res = await fetch(`${base}/v2`);
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
        const html = await res.text();
        assert.match(html, /<html lang="th">/);
        assert.match(html, /name="robots" content="noindex/);
        assert.match(html, /data-widget="sales-today"/);
        assert.match(html, /ตัวอย่าง/);
        assert.match(html, /href="\/v2\/assets\/css\/v2\.css"/);
        assert.match(html, /href="\/v2\/en"/);
        // ห้ามโหลดสคริปต์/สไตล์จากเว็บภายนอก
        // (ลิงก์ canonical/hreflang เป็น URL เต็มได้ — ไม่ใช่การโหลดไฟล์)
        assert.ok(!/<(script|link)[^>]+(src|href)="https?:\/\//.test(html.replace(/<link rel="(alternate|canonical)"[^>]*>/g, '')));

        const en = await (await fetch(`${base}/v2/en`)).text();
        assert.match(en, /<html lang="en">/);
        assert.match(en, /Sales today/);

        for (const asset of ['/v2/assets/css/v2.css', '/v2/assets/js/v2.js', '/v2/assets/widgets.css', '/v2/assets/widgets.js',
            '/v2/assets/vendor/bootstrap-icons/1.11.3/bootstrap-icons.min.css', '/v2/assets/vendor/fonts/anuphan/font.css']) {
            assert.equal((await fetch(base + asset)).status, 200, asset);
        }
        const api = await (await fetch(`${base}/v2/api/widgets.json`)).json();
        assert.equal(api.version, 1);
        assert.ok(api.widgets.some(w => w.id === 'kitchen-orders'));

        assert.equal(await (await fetch(`${base}/v2/nope`)).text(), 'old-site-404');
    });
});

test('mounted at / (after the switch) links have no /v2 and pages are indexable', async () => {
    await withServer('/', {}, async base => {
        const res = await fetch(`${base}/`);
        assert.equal(res.headers.get('x-robots-tag'), null);
        const html = await res.text();
        assert.ok(!/"\/v2[/"]/.test(html), 'no link may point under /v2');
        assert.ok(!html.includes('noindex'));
        assert.match(html, /href="\/assets\/css\/v2\.css"/);
        assert.match(html, /href="\/en"/);
    });
});

test('a failing widget is skipped and the page still renders', async () => {
    const broken = new Map(widgets);
    broken.set('sales-today', { ...widgets.get('sales-today'), getData() { throw new Error('boom'); } });
    await withServer('/v2', { widgets: broken }, async base => {
        const html = await (await fetch(`${base}/v2`)).text();
        assert.ok(!html.includes('data-widget="sales-today"'));
        assert.match(html, /data-widget="kitchen-orders"/);
    });
});

test('published layout is used, and a failing loader falls back to the default layout', async () => {
    await withServer('/v2', { loadPublished: async () => [{ widget: 'stock-expiry', size: '2x1' }] }, async base => {
        const html = await (await fetch(`${base}/v2`)).text();
        assert.match(html, /data-widget="stock-expiry"[^>]*data-size="2x1"/);
        assert.ok(!html.includes('data-widget="sales-today"'));
    });
    await withServer('/v2', { loadPublished: async () => { throw new Error('db down'); } }, async base => {
        const html = await (await fetch(`${base}/v2`)).text();
        assert.match(html, /data-widget="sales-today"/);
    });
});

// ---------- ตั้งค่าเว็บไซต์ + SEO ----------
const { normalizeSiteSettings, DEFAULT_SITE } = require('../v2/site-settings');

test('site settings fall back field by field and reject bad values', () => {
    const s = normalizeSiteSettings({
        brand: { logo_url: 'javascript:alert(1)', logo_height: 999, theme_color: 'red', favicon_url: 'https://cdn.example.com/f.png' },
        texts: { th: { title: '  ชื่อใหม่  ', description: '' }, en: { title: '' } },
        social: { facebook: 'https://facebook.com/lullapos', line: 'not a url' },
        contact: { email: 'bad-email' },
        robots: { allow_ai: 'no' }
    });
    assert.equal(s.brand.logo_url, DEFAULT_SITE.brand.logo_url);
    assert.equal(s.brand.logo_height, 80);
    assert.equal(s.brand.theme_color, DEFAULT_SITE.brand.theme_color);
    assert.equal(s.brand.favicon_url, 'https://cdn.example.com/f.png');
    assert.equal(s.texts.th.title, 'ชื่อใหม่');
    assert.equal(s.texts.th.description, DEFAULT_SITE.texts.th.description);
    assert.equal(s.texts.en.title, 'ชื่อใหม่', 'empty English falls back to Thai');
    assert.equal(s.texts.en.description, DEFAULT_SITE.texts.en.description);
    assert.equal(s.social.facebook, 'https://facebook.com/lullapos');
    assert.equal(s.social.line, '');
    assert.equal(s.contact.email, '');
    assert.equal(s.robots.allow_ai, true);
});

function metaContent(html, attr, name) {
    const m = new RegExp(`<meta ${attr}="${name.replace(/[.:]/g, '\\$&')}" content="([^"]*)"`).exec(html);
    return m ? m[1] : null;
}
const jsonLd = html => JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);

test('head has canonical, hreflang, OpenGraph, Twitter, icons and valid JSON-LD with absolute URLs', async () => {
    await withServer('/', { siteUrl: 'https://lullapos.com' }, async base => {
        const html = await (await fetch(`${base}/en`)).text();
        assert.match(html, /<link rel="canonical" href="https:\/\/lullapos\.com\/en">/);
        assert.match(html, /hreflang="th" href="https:\/\/lullapos\.com\/"/);
        assert.match(html, /hreflang="x-default" href="https:\/\/lullapos\.com\/"/);
        assert.equal(metaContent(html, 'property', 'og:url'), 'https://lullapos.com/en');
        assert.equal(metaContent(html, 'property', 'og:image'), 'https://lullapos.com/assets/brand/og-en.png');
        assert.equal(metaContent(html, 'property', 'og:locale'), 'en_US');
        assert.equal(metaContent(html, 'name', 'twitter:card'), 'summary_large_image');
        assert.match(metaContent(html, 'name', 'robots'), /^index, follow/);
        assert.match(html, /<link rel="icon" href="\/assets\/brand\/icon\.svg" type="image\/svg\+xml">/);
        assert.match(html, /<link rel="manifest" href="\/site\.webmanifest">/);
        assert.ok(!html.includes('google-site-verification'), 'no empty verification tags');

        const ld = jsonLd(html);
        assert.deepEqual(ld['@graph'].map(n => n['@type']), ['Organization', 'WebSite', 'WebPage', 'SoftwareApplication']);
        const software = ld['@graph'][3];
        assert.ok(software.featureList.length >= 3);
        assert.ok(!('aggregateRating' in software) && !('offers' in software), 'no invented ratings or prices');
        assert.equal(ld['@graph'][0].logo.url, 'https://lullapos.com/assets/brand/logo.png');
        assert.match(html, /What is Lullapos\?/);

        for (const asset of ['/assets/brand/logo.png', '/assets/brand/icon.svg', '/assets/brand/icon-32.png', '/assets/brand/apple-touch-icon.png', '/assets/brand/og-th.png', '/assets/brand/og-en.png']) {
            assert.equal((await fetch(base + asset)).status, 200, asset);
        }
    });
});

test('admin settings flow into the page: verification, socials, custom favicon, share image', async () => {
    const loadSiteSettings = async () => ({
        brand: { favicon_url: 'https://img.example.com/fav.png' },
        share: { og_image_th: 'https://img.example.com/og.jpg' },
        social: { x: 'https://x.com/lullapos', line: 'https://line.me/R/ti/p/@lullapos' },
        verification: { google: 'abc123' }
    });
    await withServer('/v2', { siteUrl: 'https://lullapos.com', loadSiteSettings }, async base => {
        const html = await (await fetch(`${base}/v2`)).text();
        assert.equal(metaContent(html, 'name', 'google-site-verification'), 'abc123');
        assert.equal(metaContent(html, 'name', 'twitter:site'), '@lullapos');
        assert.equal(metaContent(html, 'property', 'og:image'), 'https://img.example.com/og.jpg');
        assert.equal(metaContent(html, 'property', 'og:image:type'), 'image/jpeg');
        assert.match(html, /<link rel="icon" href="https:\/\/img\.example\.com\/fav\.png" type="image\/png">/);
        assert.ok(!html.includes('icon-32.png'), 'default 32px icon dropped when a custom favicon is set');
        assert.match(html, /aria-label="LINE"/);
        assert.equal(metaContent(html, 'name', 'robots'), 'noindex, nofollow');
        assert.match(html, /<link rel="canonical" href="https:\/\/lullapos\.com\/v2">/);
        assert.deepEqual(jsonLd(html)['@graph'][0].sameAs, ['https://line.me/R/ti/p/@lullapos', 'https://x.com/lullapos']);
    });
});

test('robots.txt, sitemap.xml, llms.txt, manifest and favicon.ico', async () => {
    await withServer('/', { siteUrl: 'https://lullapos.com' }, async base => {
        const robots = await (await fetch(`${base}/robots.txt`)).text();
        assert.match(robots, /User-agent: \*\nAllow: \//);
        assert.match(robots, /Sitemap: https:\/\/lullapos\.com\/sitemap\.xml/);
        assert.ok(!robots.includes('GPTBot'));

        const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
        assert.match(sitemap, /<loc>https:\/\/lullapos\.com\/<\/loc>/);
        assert.match(sitemap, /<loc>https:\/\/lullapos\.com\/en<\/loc>/);
        assert.match(sitemap, /hreflang="x-default"/);

        const llms = await (await fetch(`${base}/llms.txt`)).text();
        assert.match(llms, /^# Lullapos\n\n> /);
        assert.match(llms, /## Features\n- \[/);
        assert.match(llms, /\/doc\/stock\/lots-expiry/);

        const manifest = await (await fetch(`${base}/site.webmanifest`)).json();
        assert.equal(manifest.start_url, '/');
        assert.equal(manifest.icons[0].src, '/assets/brand/icon-192.png');

        const ico = await fetch(`${base}/favicon.ico`, { redirect: 'manual' });
        assert.equal(ico.status, 301);
        assert.equal(ico.headers.get('location'), '/assets/brand/icon-48.png');
    });
    await withServer('/', { loadSiteSettings: async () => ({ robots: { allow_ai: false } }) }, async base => {
        const robots = await (await fetch(`${base}/robots.txt`)).text();
        assert.match(robots, /User-agent: GPTBot\nDisallow: \//);
        assert.match(robots, /User-agent: ClaudeBot\nDisallow: \//);
    });
    await withServer('/v2', {}, async base => {
        assert.equal(await (await fetch(`${base}/v2/robots.txt`)).text(), 'User-agent: *\nDisallow: /\n');
        const api = await (await fetch(`${base}/v2/api/site-settings.json`)).json();
        assert.ok(api.fields.brand.some(f => f.key === 'favicon_url'));
        assert.equal(api.defaults.robots.allow_ai, true);
    });
});
