// ส่วนบน (Hero) / ส่วนท้าย (CTA) / Footer + สีหลัก — แก้ได้ที่ Admin > Marketing web > ตั้งค่าเว็บไซต์ (เจ้าของ 2026-11-23)
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createV2App } = require('../v2');
const { normalizeSiteSettings, FIELDS } = require('../v2/site-settings');

async function page(site, path = '/v2') {
    const app = express();
    app.use('/v2', createV2App({ logger: { error() {} }, loadSiteSettings: async () => site, appUrl: 'https://app.example.com' }));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    try { return await (await fetch(`http://127.0.0.1:${server.address().port}${path}`)).text(); }
    finally { await new Promise(r => server.close(r)); }
}

test('admin schema has hero / cta / footer groups and a primary colour', () => {
    for (const g of ['hero', 'cta', 'footer']) assert.ok(Array.isArray(FIELDS[g]) && FIELDS[g].length, g);
    assert.ok(FIELDS.brand.some(f => f.key === 'primary_color' && f.type === 'color'));
    assert.ok(FIELDS.hero.find(f => f.key === 'title').localized);
});

test('defaults keep the page exactly as before', async () => {
    const html = await page(null);
    assert.match(html, /<p class="lp-eyebrow">Lullapos<\/p>/);
    assert.match(html, /<h1 class="lp-title">ทุกอย่างที่ร้านต้องใช้ เห็นได้ในหน้าเดียว<\/h1>/);
    assert.match(html, /<a class="lp-btn lp-btn-primary lp-btn-lg" href="https:\/\/app\.example\.com">เริ่มใช้งาน Lullapos /);
    assert.match(html, /<a class="lp-btn lp-btn-dark" href="https:\/\/app\.example\.com">เริ่มใช้งาน<\/a>/);
    assert.match(html, /<h2>พร้อมลองกับร้านของคุณหรือยัง<\/h2>/);
    assert.match(html, /<a href="https:\/\/app\.example\.com\/doc">คู่มือการใช้งาน<\/a>/);
    assert.match(html, new RegExp(`<span>© ${new Date().getFullYear()} Lullapos</span>`));
    assert.match(html, /--lp-primary: #2563eb; --lp-primary-ink: #ffffff/);
});

test('custom texts, links, toggles and colours; English falls back to Thai', async () => {
    const site = {
        brand: { primary_color: '#FACC15' },
        hero: { title_th: 'ระบบร้านที่ใช้ง่ายที่สุด', subtitle_th: 'ลองฟรี', show_subtitle: false, button_text_th: 'ทักไลน์', button_url: 'https://line.me/R/ti/p/@lullapos',
            show_nav_button: false, show_lang_switch: false, eyebrow_th: 'ใหม่', eyebrow_en: 'New' },
        cta: { title_th: 'คุยกับเรา', button_url: 'mailto:hello@example.com', show_note: false, bg_color: '#0F172A' },
        footer: { copyright_th: 'สงวนลิขสิทธิ์ {year} · {name}', show_manual: false, show_about: false, bg_color: '#FEF3C7' }
    };
    const th = await page(site);
    assert.match(th, /<h1 class="lp-title">ระบบร้านที่ใช้ง่ายที่สุด<\/h1>/);
    assert.ok(!th.includes('lp-subtitle"'), 'subtitle hidden');
    assert.match(th, /href="https:\/\/line\.me\/R\/ti\/p\/@lullapos">ทักไลน์ /);
    assert.ok(!th.includes('lp-btn-dark') && !th.includes('bi-translate'), 'nav button and language switch hidden');
    assert.match(th, /<section class="lp-cta lp-band lp-band-dark" style="background-color: #0f172a">/);
    assert.match(th, /href="mailto:hello@example\.com"/);
    assert.ok(!th.includes('class="lp-note"'));
    assert.match(th, new RegExp(`สงวนลิขสิทธิ์ ${new Date().getFullYear()} · Lullapos`));
    assert.ok(!th.includes('lp-about') && !th.includes('คู่มือการใช้งาน'));
    assert.match(th, /class="lp-footer-wrap lp-band" style="background-color: #fef3c7"/, 'light footer colour = no dark text switch');
    assert.match(th, /--lp-primary: #facc15; --lp-primary-ink: #0f172a/, 'yellow button gets dark text');
    const en = await page(site, '/v2/en');
    assert.match(en, /<h1 class="lp-title">ระบบร้านที่ใช้ง่ายที่สุด<\/h1>/, 'empty English → Thai');
    assert.match(en, /<p class="lp-eyebrow">New<\/p>/);
});

test('hiding the bottom section removes it; unsafe links fall back to the default', async () => {
    const html = await page({ cta: { show: false } });
    assert.ok(!html.includes('class="lp-cta'));
    const s = normalizeSiteSettings({ hero: { button_url: 'javascript:alert(1)', nav_button_url: 'tel:+6621234567' } });
    assert.equal(s.hero.button_url, '');
    assert.equal(s.hero.nav_button_url, 'tel:+6621234567');
});
