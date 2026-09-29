const { DEFAULT_LOCALE } = require('../i18n');
const { LOCALIZED_SITE_SETTING_KEYS } = require('../i18n/content-config');

const MIGRATION_NAME = '001_i18n_foundation';
const SITE_SETTINGS_MIGRATION_NAME = '002_localize_site_content_settings';

async function runI18nMigrations(pool) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`
            CREATE TABLE IF NOT EXISTS landing_schema_migrations (
                name VARCHAR(100) PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Serialize startup migrations when more than one app instance boots at once.
        await client.query('SELECT pg_advisory_xact_lock(71422901)');

        const applied = await client.query(
            'SELECT 1 FROM landing_schema_migrations WHERE name = $1',
            [MIGRATION_NAME]
        );

        if (applied.rows.length === 0) {
            await client.query(`
                CREATE TABLE IF NOT EXISTS landing_site_translations (
                    locale VARCHAR(10) NOT NULL,
                    key VARCHAR(50) NOT NULL,
                    value TEXT,
                    PRIMARY KEY (locale, key)
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS landing_page_translations (
                    page_id INTEGER NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
                    locale VARCHAR(10) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    slug VARCHAR(100) NOT NULL,
                    is_published BOOLEAN NOT NULL DEFAULT false,
                    PRIMARY KEY (page_id, locale),
                    UNIQUE (locale, slug)
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS landing_page_setting_translations (
                    page_id INTEGER NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
                    locale VARCHAR(10) NOT NULL,
                    key VARCHAR(50) NOT NULL,
                    value TEXT,
                    PRIMARY KEY (page_id, locale, key)
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS landing_category_translations (
                    category_id INTEGER NOT NULL REFERENCES landing_categories(id) ON DELETE CASCADE,
                    locale VARCHAR(10) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    PRIMARY KEY (category_id, locale)
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS landing_article_translations (
                    article_id INTEGER NOT NULL REFERENCES landing_articles(id) ON DELETE CASCADE,
                    locale VARCHAR(10) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    slug TEXT NOT NULL,
                    cover_image TEXT,
                    seo_description TEXT,
                    content TEXT NOT NULL,
                    is_published BOOLEAN NOT NULL DEFAULT false,
                    PRIMARY KEY (article_id, locale),
                    UNIQUE (locale, slug)
                )
            `);

            await client.query(`
                INSERT INTO landing_site_translations (locale, key, value)
                SELECT $1, key, value
                FROM LANDING_settings
                WHERE key = ANY($2::varchar[])
                ON CONFLICT (locale, key) DO NOTHING
            `, [DEFAULT_LOCALE, LOCALIZED_SITE_SETTING_KEYS]);

            await client.query(`
                INSERT INTO landing_page_translations (page_id, locale, title, slug, is_published)
                SELECT id, $1, title, slug, is_published
                FROM landing_pages
                ON CONFLICT (page_id, locale) DO NOTHING
            `, [DEFAULT_LOCALE]);

            // Every page setting is locale-specific. This deliberately includes
            // content media such as hero, section and SEO images.
            await client.query(`
                INSERT INTO landing_page_setting_translations (page_id, locale, key, value)
                SELECT page_id, $1, key, value
                FROM landing_page_settings
                ON CONFLICT (page_id, locale, key) DO NOTHING
            `, [DEFAULT_LOCALE]);

            await client.query(`
                INSERT INTO landing_category_translations (category_id, locale, name)
                SELECT id, $1, name
                FROM landing_categories
                ON CONFLICT (category_id, locale) DO NOTHING
            `, [DEFAULT_LOCALE]);

            // Article cover images are content and therefore belong to a locale.
            await client.query(`
                INSERT INTO landing_article_translations
                    (article_id, locale, title, slug, cover_image, seo_description, content, is_published)
                SELECT id, $1, title, slug, cover_image, seo_description, content, is_published
                FROM landing_articles
                ON CONFLICT (article_id, locale) DO NOTHING
            `, [DEFAULT_LOCALE]);

            await client.query(
                'INSERT INTO landing_schema_migrations (name) VALUES ($1)',
                [MIGRATION_NAME]
            );
        }

        const siteSettingsApplied = await client.query(
            'SELECT 1 FROM landing_schema_migrations WHERE name = $1',
            [SITE_SETTINGS_MIGRATION_NAME]
        );
        if (siteSettingsApplied.rows.length === 0) {
            await client.query(`
                INSERT INTO landing_site_translations (locale, key, value)
                SELECT $1, key, value
                FROM LANDING_settings
                WHERE key = ANY($2::varchar[])
                ON CONFLICT (locale, key) DO NOTHING
            `, [DEFAULT_LOCALE, LOCALIZED_SITE_SETTING_KEYS]);
            await client.query(
                'INSERT INTO landing_schema_migrations (name) VALUES ($1)',
                [SITE_SETTINGS_MIGRATION_NAME]
            );
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { MIGRATION_NAME, SITE_SETTINGS_MIGRATION_NAME, runI18nMigrations };
