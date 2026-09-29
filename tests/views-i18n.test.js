const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ejs = require('ejs');

const { createTranslator, formatDate, getLocaleMeta, localizedPath } = require('../i18n');

function publicSettings() {
    return {
        site_name: 'Lullapos',
        seo_title: 'Lullapos',
        seo_description: 'Description',
        seo_thumbnail_url: '/seo.png',
        logo_url: '/logo.png',
        logo_height: '40',
        favicon_url: '/favicon.png',
        theme_color: '#000000',
        footer_text: 'Footer',
        article_cta_title: 'Ready to grow?',
        article_cta_btn_text: 'Contact us',
        article_cta_btn_url: '/en/contact'
    };
}

test('renders an English landing page with localized metadata and language switcher', async () => {
    const html = await ejs.renderFile(path.join(__dirname, '..', 'views', 'index.ejs'), {
        settings: {
            section_order: '[{"type":"articles","enabled":true,"bg":"bg-white"}]',
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
            banner_active: 'false',
            articles_title: 'Latest articles',
            articles_subtitle: 'Fresh advice',
            articles_btn_text: 'View all articles'
        },
        latest_articles: [{
            title: 'Retail Tips', slug: 'retail-tips', cover_image: '',
            seo_description: 'Useful advice', category_name: 'Guides', created_at: '2026-09-29T00:00:00.000Z'
        }],
        templates: {},
        sectionCatalogue: [{ type: 'articles', defaultBg: 'bg-white' }],
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
    assert.match(html, /href="\/en\/article\/retail-tips"/);
});

test('renders English article listings with localized paths and copy', async () => {
    const html = await ejs.renderFile(path.join(__dirname, '..', 'views', 'articles.ejs'), {
        settings: publicSettings(),
        articles: [{
            title: 'Retail Tips', slug: 'retail-tips', cover_image: '',
            seo_description: 'Useful advice', category_name: 'Guides', created_at: '2026-09-29T00:00:00.000Z'
        }],
        categories: [{ id: 1, name: 'Guides' }],
        currentPage: 1,
        totalPages: 1,
        search: '',
        selectedCategory: '',
        siteUrl: 'https://example.com',
        nav: [],
        locale: 'en',
        localeMeta: getLocaleMeta('en'),
        languageLinks: [
            { locale: 'th', path: '/articles', url: 'https://example.com/articles' },
            { locale: 'en', path: '/en/articles', url: 'https://example.com/en/articles' }
        ],
        localizedPath,
        formatDate,
        t: createTranslator('en')
    });

    assert.match(html, /<html lang="en">/);
    assert.match(html, /action="\/en\/articles"/);
    assert.match(html, /href="\/en\/article\/retail-tips"/);
    assert.match(html, /Business Articles and Insights/);
});

test('renders an English article with localized SEO and related links', async () => {
    const html = await ejs.renderFile(path.join(__dirname, '..', 'views', 'article.ejs'), {
        settings: publicSettings(),
        article: {
            title: 'Retail Tips', slug: 'retail-tips', cover_image: '', seo_description: 'Useful advice',
            category_name: 'Guides', content: '<p>Article body</p>', created_at: '2026-09-29T00:00:00.000Z'
        },
        related_articles: [{
            title: 'More Tips', slug: 'more-tips', cover_image: '', seo_description: 'More advice',
            category_name: 'Guides', created_at: '2026-09-28T00:00:00.000Z'
        }],
        siteUrl: 'https://example.com',
        nav: [],
        locale: 'en',
        localeMeta: getLocaleMeta('en'),
        languageLinks: [
            { locale: 'th', path: '/article/tips', url: 'https://example.com/article/tips' },
            { locale: 'en', path: '/en/article/retail-tips', url: 'https://example.com/en/article/retail-tips' }
        ],
        localizedPath,
        formatDate,
        t: createTranslator('en')
    });

    assert.match(html, /canonical" href="https:\/\/example\.com\/en\/article\/retail-tips"/);
    assert.match(html, /"inLanguage":"en-US"/);
    assert.match(html, /href="\/en\/article\/more-tips"/);
    assert.match(html, /More articles you may like/);
});

test('renders one global admin language selector for the active content locale', async () => {
    const html = await ejs.renderFile(path.join(__dirname, '..', 'views', 'admin', '_topbar.ejs'), {
        heading: 'Pages',
        locale: 'en',
        supportedLocales: ['th', 'en'],
        adminT: createTranslator('en')
    });

    assert.match(html, /Content language/);
    assert.match(html, /option value="en" selected/);
    assert.match(html, /href="\/en" target="_blank"/);
});
