const test = require('node:test');
const assert = require('node:assert/strict');

const { MIGRATION_NAME, SITE_SETTINGS_MIGRATION_NAME, runI18nMigrations } = require('../db/i18n-migrations');

function createPool(options = {}) {
    const calls = [];
    const client = {
        async query(sql, params) {
            const normalized = String(sql).replace(/\s+/g, ' ').trim();
            calls.push({ sql: normalized, params });
            if (options.failOn && normalized.includes(options.failOn)) throw new Error('migration failed');
            if (normalized.startsWith('SELECT 1 FROM landing_schema_migrations')) {
                const applied = options.applied || (options.appliedMigrations || []).includes(params[0]);
                return { rows: applied ? [{ exists: 1 }] : [] };
            }
            return { rows: [] };
        },
        release() {
            calls.push({ sql: 'RELEASE' });
        }
    };
    return { calls, pool: { connect: async () => client } };
}

test('creates translation tables and backfills existing Thai content', async () => {
    const { calls, pool } = createPool();
    await runI18nMigrations(pool);

    const sql = calls.map(call => call.sql).join('\n');
    assert.match(sql, /pg_advisory_xact_lock/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS landing_site_translations/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS landing_page_setting_translations/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS landing_article_translations/);
    assert.match(sql, /cover_image/);
    assert.match(sql, /INSERT INTO landing_schema_migrations/);
    assert.equal(calls.find(call => call.sql.includes('WHERE key = ANY')).params[0], 'th');
    assert.equal(calls.at(-2).sql, 'COMMIT');
    assert.equal(calls.at(-1).sql, 'RELEASE');
});

test('does not rerun an applied migration', async () => {
    const { calls, pool } = createPool({ applied: true });
    await runI18nMigrations(pool);

    assert.equal(calls.some(call => call.sql.includes('CREATE TABLE IF NOT EXISTS landing_site_translations')), false);
    assert.equal(calls.some(call => call.params && call.params[0] === MIGRATION_NAME && call.sql.startsWith('INSERT')), false);
    assert.equal(calls.at(-2).sql, 'COMMIT');
});

test('adds newly localized site keys when the foundation migration already exists', async () => {
    const { calls, pool } = createPool({ appliedMigrations: [MIGRATION_NAME] });
    await runI18nMigrations(pool);

    assert.equal(calls.some(call => call.sql.includes('CREATE TABLE IF NOT EXISTS landing_site_translations')), false);
    const backfill = calls.find(call => call.sql.includes('WHERE key = ANY'));
    assert.ok(backfill);
    assert.equal(backfill.params[1].includes('banner_active'), true);
    assert.equal(calls.some(call => call.params && call.params[0] === SITE_SETTINGS_MIGRATION_NAME && call.sql.startsWith('INSERT')), true);
});

test('rolls back and releases the client when migration fails', async () => {
    const { calls, pool } = createPool({ failOn: 'landing_page_translations' });
    await assert.rejects(runI18nMigrations(pool), /migration failed/);
    assert.equal(calls.some(call => call.sql === 'ROLLBACK'), true);
    assert.equal(calls.at(-1).sql, 'RELEASE');
});
