const test = require('node:test');
const assert = require('node:assert/strict');

const {
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    createTranslator,
    formatDate,
    getLocaleMeta,
    localizedPath,
    normalizeLocale,
    translate
} = require('../i18n');
const {
    isLocalizedSiteSetting,
    SHARED_BRAND_ASSET_KEYS
} = require('../i18n/content-config');
const {
    articlePath,
    buildArticleLanguageLinks,
    buildPageLanguageLinks,
    pagePath
} = require('../i18n/page-localization');

test('supports Thai as the default locale and English as the second locale', () => {
    assert.equal(DEFAULT_LOCALE, 'th');
    assert.deepEqual(SUPPORTED_LOCALES, ['th', 'en']);
    assert.equal(normalizeLocale('en-US'), 'en');
    assert.equal(normalizeLocale('unknown'), 'th');
});

test('builds localized paths without changing existing Thai URLs', () => {
    assert.equal(localizedPath('th', '/'), '/');
    assert.equal(localizedPath('th', '/articles'), '/articles');
    assert.equal(localizedPath('en', '/'), '/en');
    assert.equal(localizedPath('en', '/articles'), '/en/articles');
});

test('translates keys and falls back safely', () => {
    assert.equal(translate('en', 'errors.not_found'), 'Page not found');
    assert.equal(createTranslator('th')('errors.not_found'), 'ไม่พบหน้าที่ต้องการ');
    assert.equal(translate('en', 'missing.key'), 'missing.key');
});

test('provides locale metadata and locale-aware date formatting', () => {
    assert.equal(getLocaleMeta('th').ogLocale, 'th_TH');
    assert.equal(getLocaleMeta('en').prefix, '/en');
    assert.equal(
        formatDate('2026-09-29T00:00:00.000Z', 'en', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }),
        '09/29/2026'
    );
});

test('keeps only logo and favicon as shared brand images', () => {
    assert.deepEqual(SHARED_BRAND_ASSET_KEYS, ['logo_url', 'favicon_url']);
    assert.equal(isLocalizedSiteSetting('banner_list'), true);
    assert.equal(isLocalizedSiteSetting('banner_active'), true);
    assert.equal(isLocalizedSiteSetting('facebook_url'), true);
    assert.equal(isLocalizedSiteSetting('logo_url'), false);
    assert.equal(isLocalizedSiteSetting('favicon_url'), false);
});

test('maps language switch links to the same translated page', () => {
    const links = buildPageLanguageLinks([
        { locale: 'th', slug: 'เกี่ยวกับเรา', is_home: false, is_published: true },
        { locale: 'en', slug: 'about-us', is_home: false, is_published: true }
    ], 'https://example.com');

    assert.deepEqual(links, [
        { locale: 'th', path: '/%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B9%88%E0%B8%A2%E0%B8%A7%E0%B8%81%E0%B8%B1%E0%B8%9A%E0%B9%80%E0%B8%A3%E0%B8%B2', url: 'https://example.com/%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B9%88%E0%B8%A2%E0%B8%A7%E0%B8%81%E0%B8%B1%E0%B8%9A%E0%B9%80%E0%B8%A3%E0%B8%B2' },
        { locale: 'en', path: '/en/about-us', url: 'https://example.com/en/about-us' }
    ]);
});

test('omits unpublished translations from language switch links', () => {
    const links = buildPageLanguageLinks([
        { locale: 'th', slug: 'home', is_home: true, is_published: true },
        { locale: 'en', slug: 'home', is_home: true, is_published: false }
    ]);

    assert.deepEqual(links, [{ locale: 'th', path: '/', url: '/' }]);
    assert.equal(pagePath({ is_home: true, slug: 'home' }, 'en'), '/en');
});

test('maps article language links to each localized slug', () => {
    const links = buildArticleLanguageLinks([
        { locale: 'th', slug: 'เคล็ดลับร้านค้า', is_published: true },
        { locale: 'en', slug: 'retail-tips', is_published: true }
    ], 'https://example.com');

    assert.equal(articlePath({ slug: 'retail-tips' }, 'en'), '/en/article/retail-tips');
    assert.deepEqual(links, [
        { locale: 'th', path: '/article/%E0%B9%80%E0%B8%84%E0%B8%A5%E0%B9%87%E0%B8%94%E0%B8%A5%E0%B8%B1%E0%B8%9A%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B9%89%E0%B8%B2', url: 'https://example.com/article/%E0%B9%80%E0%B8%84%E0%B8%A5%E0%B9%87%E0%B8%94%E0%B8%A5%E0%B8%B1%E0%B8%9A%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B9%89%E0%B8%B2' },
        { locale: 'en', path: '/en/article/retail-tips', url: 'https://example.com/en/article/retail-tips' }
    ]);
});
