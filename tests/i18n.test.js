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
    assert.equal(isLocalizedSiteSetting('logo_url'), false);
    assert.equal(isLocalizedSiteSetting('favicon_url'), false);
});
