const dictionaries = {
    th: require('./locales/th.json'),
    en: require('./locales/en.json')
};

const SUPPORTED_LOCALES = Object.freeze(['th', 'en']);
const DEFAULT_LOCALE = 'th';

const LOCALE_META = Object.freeze({
    th: Object.freeze({ locale: 'th', htmlLang: 'th', intlLocale: 'th-TH', ogLocale: 'th_TH', prefix: '' }),
    en: Object.freeze({ locale: 'en', htmlLang: 'en', intlLocale: 'en-US', ogLocale: 'en_US', prefix: '/en' })
});

function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
    const locale = String(value || '').trim().toLowerCase().split(/[-_]/)[0];
    return SUPPORTED_LOCALES.includes(locale) ? locale : fallback;
}

function getLocaleMeta(locale) {
    return LOCALE_META[normalizeLocale(locale)];
}

function getByPath(object, key) {
    return String(key || '').split('.').reduce((value, part) => {
        if (!value || !Object.prototype.hasOwnProperty.call(value, part)) return undefined;
        return value[part];
    }, object);
}

function interpolate(value, variables) {
    return String(value).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key) => {
        return Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : match;
    });
}

function translate(locale, key, variables = {}) {
    const normalized = normalizeLocale(locale);
    const localized = getByPath(dictionaries[normalized], key);
    const fallback = getByPath(dictionaries[DEFAULT_LOCALE], key);
    const value = localized === undefined ? fallback : localized;
    return value === undefined ? String(key) : interpolate(value, variables);
}

function createTranslator(locale) {
    const normalized = normalizeLocale(locale);
    return (key, variables) => translate(normalized, key, variables);
}

function localePrefix(locale) {
    return getLocaleMeta(locale).prefix;
}

function localizedPath(locale, pathname = '/') {
    const path = String(pathname || '/').startsWith('/') ? String(pathname || '/') : '/' + pathname;
    const prefix = localePrefix(locale);
    if (!prefix) return path;
    return path === '/' ? prefix : prefix + path;
}

function formatDate(value, locale, options = {}) {
    return new Intl.DateTimeFormat(getLocaleMeta(locale).intlLocale, options).format(new Date(value));
}

module.exports = {
    DEFAULT_LOCALE,
    LOCALE_META,
    SUPPORTED_LOCALES,
    createTranslator,
    formatDate,
    getLocaleMeta,
    localePrefix,
    localizedPath,
    normalizeLocale,
    translate
};
