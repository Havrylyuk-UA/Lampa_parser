import axios from 'axios';
import * as cheerio from 'cheerio';

/** RAW site and optional proxy (e.g., Cloudflare Worker) */
const RAW_BASE = 'https://uaserial.top';
const PROXY_BASE = process.env.PROXY_BASE || '';   // e.g. 'https://your-worker.workers.dev/'

/** Base for axios */
const BASE = PROXY_BASE ? `${PROXY_BASE}${RAW_BASE}` : RAW_BASE;

export const HTTP = axios.create({
  baseURL: BASE,
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept-Language': 'uk,ru;q=0.9,en;q=0.8'
  },
  timeout: 15000
});

/** Absolute URL helper (proxy-aware) */
export const abs = (u) => {
  if (!u) return undefined;
  if (u.startsWith('http')) return PROXY_BASE ? `${PROXY_BASE}${u}` : u;
  return `${BASE}${u.startsWith('/') ? '' : '/'}${u}`;
};

export async function getCatalog(page = 1, query) {
  const url = query
    ? `/search?q=${encodeURIComponent(query)}&page=${page}`
    : `/?page=${page}`;

  const { data } = await HTTP.get(url);
  const $ = cheerio.load(data);

  const seen = new Set();
  const items = [];

  // Movies: /movie-...
  $('a[href^="/movie-"]').each((_, a) => {
    const href = $(a).attr('href'); if (!href) return;
    const absUrl = abs(href);
    const slug = new URL(absUrl).pathname.replace(/^\/+|\/+$/g, '');
    if (!slug || seen.has(slug)) return; seen.add(slug);

    const cont = $(a).closest('[class], article, li, div');
    let title = cont.find('h1,h2,h3,.title,.card-title').first().text().trim()
             || $(a).attr('title') || $(a).text().trim();
    const imgEl = cont.find('img').first().get(0) || $(a).find('img').first().get(0);
    const poster = imgEl ? abs($(imgEl).attr('src')) : undefined;
    if (!title && imgEl) title = ($(imgEl).attr('alt') || '').trim();
    const yearTxt = cont.find('.year,.meta .year').first().text().trim();
    const year = yearTxt ? Number((yearTxt.match(/\d{4}/)||[])[0]) : undefined;

    items.push({ id: slug, title: title || slug, url: absUrl, poster, year, kind: 'movie' });
  });

  // Series/seasons: /<slug>/season-<n>
  $('a[href*="/season-"]').each((_, a) => {
    const href = $(a).attr('href'); if (!href) return;
    const absUrl = abs(href);
    const slug = new URL(absUrl).pathname.replace(/^\/+|\/+$/g, '');
    if (!slug || seen.has(slug)) return; seen.add(slug);

    const cont = $(a).closest('[class], article, li, div');
    let title = cont.find('h1,h2,h3,.title,.card-title').first().text().trim()
             || $(a).attr('title') || $(a).text().trim();
    const imgEl = cont.find('img').first().get(0) || $(a).find('img').first().get(0);
    const poster = imgEl ? abs($(imgEl).attr('src')) : undefined;
    if (!title && imgEl) title = ($(imgEl).attr('alt') || '').trim();
    const yearTxt = cont.find('.year,.meta .year').first().text().trim();
    const year = yearTxt ? Number((yearTxt.match(/\d{4}/)||[])[0]) : undefined;

    items.push({ id: slug, title: title || slug, url: absUrl, poster, year, kind: 'tv' });
  });

  // uniq
  const uniq = []; const byId = new Set();
  for (const it of items) { if (!byId.has(it.id)) { byId.add(it.id); uniq.push(it); } }
  return uniq;
}

export async function getDetails(idOrSlug) {
  const path = idOrSlug.startsWith('/') ? idOrSlug : `/${idOrSlug}`;
  const { data } = await HTTP.get(path);
  const $ = cheerio.load(data);

  const title = $('h1, .title, .heading').first().text().trim();
  const poster = abs($('.poster img, .cover img, .thumb img').attr('src'));
  const yTxt = $('.meta .year, .year').first().text();
  const year = yTxt ? Number((yTxt.match(/\d{4}/)||[])[0]) : undefined;
  const description = $('.description, .plot, .text, .full-text').first().text().trim();
  const genres = $('.genres a, .genre a, .tags a').map((_, a) => $(a).text().trim()).get();

  // seasons/episodes (best effort)
  const seasons = $('.season, [data-season]').map((_, s) => {
    const season = Number($(s).attr('data-season') || ($(s).find('.season-title').text().match(/\d+/)||[])[0] || 1);
    const episodes = $(s).find('.episode, [data-ep], a[href*="/season-"][href*="/episode-"]').map((_, e) => {
      const ep = Number($(e).attr('data-ep') || ($(e).find('.ep-num').text().match(/\d+/)||[])[0] || ($(e).text().match(/episode[-\s]?(\d+)/i)||[])[1] || 1);
      const href = $(e).find('a').attr('href') || $(e).attr('href');
      const url = abs(href);
      const slug = url ? new URL(url).pathname.replace(/^\/+|\/+$/g, '') : `${idOrSlug}#s${season}e${ep}`;
      const etitle = $(e).find('.ep-title, a').first().text().trim();
      return { ep, id: slug, title: etitle };
    }).get();
    return { season, episodes };
  }).get();

  const slug = path.replace(/^\/+|\/+$/g, '');
  return {
    id: slug, title, url: `${RAW_BASE}${path}`, poster, year, description, genres,
    seasons: seasons.length ? seasons : undefined,
    kind: slug.includes('/season-') ? 'tv' : (slug.startsWith('movie-') ? 'movie' : 'tv')
  };
}

export async function getStreams(idOrSlug) {
  const path = idOrSlug.startsWith('/') ? idOrSlug : `/${idOrSlug}`;
  const { data } = await HTTP.get(path);
  const $ = cheerio.load(data);

  const streams = [];

  // 1) Direct <video><source>
  $('video source').each((_, s) => {
    const src = $(s).attr('src'); if (!src) return;
    const quality = $(s).attr('data-quality') || $(s).attr('label') || undefined;
    streams.push({ id: `${idOrSlug}:${quality || 'auto'}`, url: abs(src), quality });
  });

  // 2) HLS links in scripts
  $('script, [data-player]').each((_, el) => {
    const txt = ($(el).attr('data-player') || $(el).html() || '').toString();
    const hls = [...txt.matchAll(/https?:\/\/[^"'\\s]+\.m3u8/gi)].map(m => m[0]);
    hls.forEach((u, i) => streams.push({ id: `${idOrSlug}:hls${i}`, url: PROXY_BASE ? `${PROXY_BASE}${u}` : u }));
  });

  // 3) Try iframe if empty
  if (!streams.length) {
    const iframeSrc = $('iframe[src]').attr('src');
    if (iframeSrc) {
      try {
        const absIframe = abs(iframeSrc);
        const { data: iframeHtml } = await axios.get(absIframe, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': RAW_BASE }
        });
        const _$ = cheerio.load(iframeHtml);

        _$('#player source, video source').each((_, s) => {
          const src = _$(s).attr('src'); if (src) streams.push({ id: `${idOrSlug}:ifr`, url: PROXY_BASE ? `${PROXY_BASE}${src}` : src });
        });

        _$('#player script, script').each((_, s) => {
          const txt = (_$(s).html() || '').toString();
          const hls = [...txt.matchAll(/https?:\/\/[^"'\\s]+\.m3u8/gi)].map(m => m[0]);
          hls.forEach((u, i) => streams.push({ id: `${idOrSlug}:ifr${i}`, url: PROXY_BASE ? `${PROXY_BASE}${u}` : u }));
        });
      } catch (e) { /* ignore */ }
    }
  }

  // subtitles on main page
  $('track[kind="subtitles"]').each((_, t) => {
    const sUrl = $(t).attr('src'); const lang = $(t).attr('srclang') || $(t).attr('label') || 'und';
    if (sUrl) {
      if (!streams.length) {
        const first = $('video source').attr('src');
        if (first) streams.push({ id: `${idOrSlug}:auto`, url: abs(first) });
      }
      if (streams.length) {
        streams[0].subtitles = streams[0].subtitles || [];
        streams[0].subtitles.push({ lang, url: abs(sUrl) });
      }
    }
  });

  // uniq by URL
  const uniq = new Map(); for (const s of streams) if (s.url) uniq.set(s.url, s);
  return [...uniq.values()];
}