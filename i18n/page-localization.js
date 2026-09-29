const { SUPPORTED_LOCALES, localizedPath } = require('./index');

function pagePath(page, locale) {
    if (!page || page.is_home) return localizedPath(locale, '/');
    return localizedPath(locale, '/' + encodeURIComponent(page.slug));
}

function buildPageLanguageLinks(rows, siteUrl = '') {
    const byLocale = new Map((rows || []).map(row => [row.locale, row]));
    return SUPPORTED_LOCALES.map(locale => {
        const page = byLocale.get(locale);
        if (!page || !page.is_published) return null;
        const path = pagePath(page, locale);
        return { locale, path, url: siteUrl ? siteUrl + path : path };
    }).filter(Boolean);
}

function articlePath(article, locale) {
    return localizedPath(locale, '/article/' + encodeURIComponent(article.slug));
}

function buildArticleLanguageLinks(rows, siteUrl = '') {
    const byLocale = new Map((rows || []).map(row => [row.locale, row]));
    return SUPPORTED_LOCALES.map(locale => {
        const article = byLocale.get(locale);
        if (!article || !article.is_published) return null;
        const path = articlePath(article, locale);
        return { locale, path, url: siteUrl ? siteUrl + path : path };
    }).filter(Boolean);
}

module.exports = { articlePath, buildArticleLanguageLinks, buildPageLanguageLinks, pagePath };
