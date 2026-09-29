// Site values that contain visitor-facing content. Technical/display settings stay
// in LANDING_settings. Logo and favicon are intentionally shared by every locale.
const LOCALIZED_SITE_SETTING_KEYS = Object.freeze([
    'site_name',
    'nav_items',
    'footer_text',
    'banner_list',
    'article_cta_title',
    'article_cta_btn_text',
    'article_cta_btn_url'
]);

const SHARED_BRAND_ASSET_KEYS = Object.freeze(['logo_url', 'favicon_url']);

function isLocalizedSiteSetting(key) {
    return LOCALIZED_SITE_SETTING_KEYS.includes(key);
}

module.exports = {
    LOCALIZED_SITE_SETTING_KEYS,
    SHARED_BRAND_ASSET_KEYS,
    isLocalizedSiteSetting
};
