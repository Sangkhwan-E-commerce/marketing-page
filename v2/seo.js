// 🌟 SEO + AI SEO ของเว็บ v2 — สร้างแท็กใน <head>, JSON-LD, robots.txt, sitemap.xml, llms.txt, site.webmanifest
//    URL ทุกตัวเป็น URL เต็ม (siteUrl + base) เพราะ Facebook/LINE/Google/AI ต้องการ URL เต็ม
//    ⚠️ ห้ามใส่ข้อมูลที่ไม่จริงใน JSON-LD (เช่น คะแนนรีวิว ราคา จำนวนผู้ใช้) — Google ลงโทษ และขัดกติกาเจ้าของ

// บอทของ AI ที่รู้จัก — ปิดได้จากหน้า Admin (robots.allow_ai)
const AI_CRAWLERS = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
    'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
    'PerplexityBot', 'Perplexity-User',
    'Google-Extended', 'Applebot-Extended', 'CCBot'
];

const OG_LOCALE = { th: 'th_TH', en: 'en_US' };

function joinUrl(origin, path) {
    return `${origin.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

// รูปใน settings: URL เต็มใช้ตามนั้น · "/assets/..." คือไฟล์ของเว็บนี้ → ต่อ siteUrl + base
function absAsset(ctx, url) {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return joinUrl(ctx.siteUrl, `${ctx.base}${url}`);
}
// สำหรับ <link>/<img> ในหน้า — ไฟล์ของเว็บนี้ใช้ path สัมพัทธ์กับ base
function localAsset(ctx, url) {
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : `${ctx.base}${url}`;
}

const isDefaultIcon = site => site.brand.favicon_url.startsWith('/assets/brand/');

function pageUrls(ctx) {
    const th = joinUrl(ctx.siteUrl, ctx.base || '/');
    const en = joinUrl(ctx.siteUrl, `${ctx.base}/en`);
    return { th, en };
}

function xHandle(url) {
    const m = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/?$/i.exec(url || '');
    return m ? `@${m[1]}` : null;
}

function imageType(url) {
    if (/\.svg(\?|$)/i.test(url)) return 'image/svg+xml';
    if (/\.png(\?|$)/i.test(url)) return 'image/png';
    if (/\.ico(\?|$)/i.test(url)) return 'image/x-icon';
    if (/\.webp(\?|$)/i.test(url)) return 'image/webp';
    return 'image/jpeg';
}

function buildJsonLd(ctx, { site, locale, texts, urls, ogImage, features }) {
    const org = `${joinUrl(ctx.siteUrl, '/')}#organization`;
    const website = `${joinUrl(ctx.siteUrl, '/')}#website`;
    const software = `${joinUrl(ctx.siteUrl, '/')}#software`;
    const sameAs = Object.values(site.social).filter(Boolean);
    const organization = {
        '@type': 'Organization',
        '@id': org,
        name: texts.site_name,
        url: joinUrl(ctx.siteUrl, '/'),
        logo: { '@type': 'ImageObject', url: absAsset(ctx, site.brand.logo_url) },
        ...(sameAs.length ? { sameAs } : {})
    };
    if (site.contact.email || site.contact.phone) {
        organization.contactPoint = {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            availableLanguage: ['th', 'en'],
            ...(site.contact.email ? { email: site.contact.email } : {}),
            ...(site.contact.phone ? { telephone: site.contact.phone } : {})
        };
    }
    const graph = [
        organization,
        {
            '@type': 'WebSite',
            '@id': website,
            url: joinUrl(ctx.siteUrl, '/'),
            name: texts.site_name,
            inLanguage: ['th', 'en'],
            publisher: { '@id': org }
        },
        {
            '@type': 'WebPage',
            '@id': `${urls[locale]}#webpage`,
            url: urls[locale],
            name: texts.title,
            description: texts.description,
            inLanguage: locale,
            isPartOf: { '@id': website },
            about: { '@id': software },
            primaryImageOfPage: { '@type': 'ImageObject', url: ogImage }
        },
        {
            '@type': 'SoftwareApplication',
            '@id': software,
            name: texts.site_name,
            url: ctx.appUrl,
            description: texts.about,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web, Windows',
            image: ogImage,
            publisher: { '@id': org },
            ...(features.length ? { featureList: features.map(f => (f.description ? `${f.name}: ${f.description}` : f.name)) } : {})
        }
    ];
    // กัน "</script>" ในข้อความหลุดออกจากแท็ก
    return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

// ข้อมูลทั้งหมดที่ <head> ต้องใช้
function buildHead(ctx, { site, locale, features = [] }) {
    const texts = site.texts[locale];
    const urls = pageUrls(ctx);
    const ogImage = absAsset(ctx, site.share[`og_image_${locale}`] || site.share.og_image_th);
    const altLocale = locale === 'th' ? 'en' : 'th';
    return {
        lang: locale,
        title: texts.title,
        description: texts.description,
        canonical: urls[locale],
        alternates: [
            { hreflang: 'th', href: urls.th },
            { hreflang: 'en', href: urls.en },
            { hreflang: 'x-default', href: urls.th }
        ],
        robots: ctx.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1',
        themeColor: site.brand.theme_color,
        icons: {
            favicon: localAsset(ctx, site.brand.favicon_url),
            faviconType: imageType(site.brand.favicon_url),
            // PNG 32px ชุดตั้งต้น ใช้เฉพาะตอนยังไม่ได้อัปโหลด favicon เอง (ไม่งั้นเบราว์เซอร์อาจเลือกรูปเก่า)
            png32: isDefaultIcon(site) ? localAsset(ctx, '/assets/brand/icon-32.png') : null,
            apple: localAsset(ctx, site.brand.apple_touch_icon_url)
        },
        manifest: `${ctx.base}/site.webmanifest`,
        og: {
            type: 'website',
            site_name: texts.site_name,
            title: texts.title,
            description: texts.description,
            url: urls[locale],
            image: ogImage,
            image_type: imageType(ogImage),
            image_width: 1200,
            image_height: 630,
            image_alt: texts.og_image_alt,
            locale: OG_LOCALE[locale],
            locale_alternate: OG_LOCALE[altLocale]
        },
        twitter: { card: 'summary_large_image', site: xHandle(site.social.x) },
        verification: site.verification,
        jsonLd: buildJsonLd(ctx, { site, locale, texts, urls, ogImage, features })
    };
}

function buildRobotsTxt(ctx, site) {
    const lines = [];
    if (ctx.noindex) {
        // ระหว่างพัฒนาที่ /v2 — ไฟล์นี้ยังไม่ถูกบอทอ่าน (robots.txt จริงอยู่ที่ราก) แต่ตอบให้ตรงกับ noindex
        lines.push('User-agent: *', 'Disallow: /');
        return `${lines.join('\n')}\n`;
    }
    if (!site.robots.allow_ai) {
        for (const bot of AI_CRAWLERS) lines.push(`User-agent: ${bot}`, 'Disallow: /', '');
    }
    lines.push('User-agent: *', 'Allow: /', '', `Sitemap: ${joinUrl(ctx.siteUrl, `${ctx.base}/sitemap.xml`)}`);
    return `${lines.join('\n')}\n`;
}

function buildSitemap(ctx) {
    const urls = pageUrls(ctx);
    const alt = ['th', 'en'].map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${urls[l]}"/>`)
        .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${urls.th}"/>`).join('\n');
    const entry = loc => `  <url>\n    <loc>${loc}</loc>\n${alt}\n  </url>`;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entry(urls.th)}\n${entry(urls.en)}\n</urlset>\n`;
}

// llms.txt (llmstxt.org) — สรุปเว็บเป็น Markdown ให้ AI อ่านง่าย ภาษาอังกฤษเป็นหลัก + ไทยกำกับ
function buildLlmsTxt(ctx, { site, features }) {
    const en = site.texts.en;
    const th = site.texts.th;
    const urls = pageUrls(ctx);
    const out = [
        `# ${en.site_name}`,
        '',
        `> ${en.description}`,
        '',
        en.about,
        '',
        `ภาษาไทย: ${th.about}`,
        '',
        '## Features'
    ];
    for (const f of features) {
        const label = f.docUrl ? `[${f.name.en}](${f.docUrl})` : f.name.en;
        out.push(`- ${label}: ${f.description.en || f.name.th} (${f.name.th})`);
    }
    out.push('', '## Links',
        `- [Home (Thai)](${urls.th})`,
        `- [Home (English)](${urls.en})`,
        `- [User manual](${ctx.appUrl}/doc): step-by-step guides for every part of the system (Thai)`,
        `- [Sign in / start](${ctx.appUrl})`);
    const social = Object.entries(site.social).filter(([, v]) => v);
    if (social.length) {
        out.push('', '## Social');
        for (const [k, v] of social) out.push(`- [${k}](${v})`);
    }
    return `${out.join('\n')}\n`;
}

function buildManifest(ctx, site) {
    return {
        name: site.texts.th.site_name,
        short_name: site.texts.th.site_name,
        description: site.texts.th.description,
        lang: 'th',
        start_url: `${ctx.base}/`,
        scope: `${ctx.base}/`,
        display: 'browser',
        background_color: '#ffffff',
        theme_color: site.brand.theme_color,
        icons: isDefaultIcon(site) ? [
            { src: localAsset(ctx, '/assets/brand/icon-192.png'), sizes: '192x192', type: 'image/png' },
            { src: localAsset(ctx, '/assets/brand/icon-512.png'), sizes: '512x512', type: 'image/png' },
            { src: localAsset(ctx, '/assets/brand/icon.svg'), sizes: 'any', type: 'image/svg+xml' }
        ] : [{ src: localAsset(ctx, site.brand.favicon_url), sizes: '512x512', type: imageType(site.brand.favicon_url) }]
    };
}

module.exports = { AI_CRAWLERS, buildHead, buildRobotsTxt, buildSitemap, buildLlmsTxt, buildManifest, absAsset, localAsset, pageUrls };
