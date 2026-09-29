const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ejs = require('ejs');

const { createTranslator, getLocaleMeta, localizedPath } = require('../i18n');

test('renders an English landing page with localized metadata and language switcher', async () => {
    const html = await ejs.renderFile(path.join(__dirname, '..', 'views', 'index.ejs'), {
        settings: {
            section_order: '[]',
            site_name: 'Lullapos',
            seo_title: 'English Home',
            seo_description: 'Description',
            seo_keywords: '',
            seo_thumbnail_url: '',
            logo_url: '/logo.png',
            logo_height: '40',
            theme_color: '#000000',
            nav_items: '[]',
            footer_text: 'Footer',
            banner_active: 'false'
        },
        latest_articles: [],
        templates: {},
        sectionCatalogue: [],
        siteUrl: 'https://example.com',
        page: { id: 1, is_home: true, title: 'Home' },
        pageUrl: 'https://example.com/en',
        nav: [],
        locale: 'en',
        localeMeta: getLocaleMeta('en'),
        languageLinks: [
            { locale: 'th', path: '/', url: 'https://example.com/' },
            { locale: 'en', path: '/en', url: 'https://example.com/en' }
        ],
        localizedPath,
        t: createTranslator('en')
    });

    assert.match(html, /<html lang="en">/);
    assert.match(html, /hreflang="th" href="https:\/\/example\.com\/"/);
    assert.match(html, /href="\/" hreflang="th"/);
    assert.match(html, /<meta property="og:locale" content="en_US">/);
});
