import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE = 'https://uaserial.top';

const HTTP = axios.create({
  baseURL: BASE,
  headers: { 'User-Agent': 'Mozilla/5.0' },
  timeout: 15000
});

const abs = (u) => {
  if (!u) return undefined;
  if (u.startsWith('http')) return u;
  return `${BASE}${u.startsWith('/') ? '' : '/'}${u}`;
};

export async function getCatalog(page = 1, query) {
  const url = query ? `/search?q=${encodeURIComponent(query)}&page=${page}` : `/?page=${page}`;
  const { data } = await HTTP.get(url);
  const $ = cheerio.load(data);
  const items = [];

  // Try several common card patterns
  $('[data-card], .card, .movie-card, .poster, .film, .item').each((_, el) => {
    const link = $(el).find('a').attr('href') || $(el).attr('href');
    if (!link) return;
    const url = abs(link);
    const title = $(el).find('.title, .card-title, h3, h2').first().text().trim() || $(el).attr('title');
    const poster = abs($(el).find('img').attr('src'));
    const yearTxt = $(el).find('.year, .meta .year').first().text().trim();
    const year = yearTxt ? Number((yearTxt.match(/\d{4}/)||[])[0]) : undefined;
    const slug = new URL(url).pathname.replace(/^\/+|\/+$/g, '');
    const kind = slug.startsWith('series') ? 'tv' : 'movie';
    if (title && slug) items.push({ id: slug, title, url, poster, year, kind });
  });

  return items;
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

  const seasons = $('.season, [data-season]').map((_, s) => {
    const season = Number($(s).attr('data-season') || ($(s).find('.season-title').text().match(/\d+/)||[])[0] || 1);
    const episodes = $(s).find('.episode, [data-ep]').map((_, e) => {
      const ep = Number($(e).attr('data-ep') || ($(e).find('.ep-num').text().match(/\d+/)||[])[0] || 1);
      const href = $(e).find('a').attr('href');
      const url = abs(href);
      const slug = url ? new URL(url).pathname.replace(/^\/+|\/+$/g, '') : `${idOrSlug}#s${season}e${ep}`;
      const title = $(e).find('.ep-title, a').first().text().trim();
      return { ep, id: slug, title };
    }).get();
    return { season, episodes };
  }).get();

  const slug = path.replace(/^\/+|\/+$/g, '');
  return {
    id: slug,
    title,
    url: `${BASE}${path}`,
    poster,
    year,
    description,
    genres,
    seasons: seasons.length ? seasons : undefined,
    kind: slug.startsWith('series') ? 'tv' : 'movie'
  };
}

export async function getStreams(idOrSlug) {
  const path = idOrSlug.startsWith('/') ? idOrSlug : `/${idOrSlug}`;
  const { data } = await HTTP.get(path);
  const $ = cheerio.load(data);

  const streams = [];

  $('video source').each((_, s) => {
    const src = $(s).attr('src');
    if (!src) return;
    const quality = $(s).attr('data-quality') || $(s).attr('label') || undefined;
    streams.push({ id: `${idOrSlug}:${quality || 'auto'}`, url: abs(src), quality });
  });

  // Look for HLS links in inline scripts or data attributes
  $('script, [data-player]').each((_, el) => {
    const txt = ($(el).attr('data-player') || $(el).html() || '').toString();
    if (!txt) return;
    const hls = [...txt.matchAll(/https?:\/\/[^"'\\s]+\.m3u8/gi)].map(m => m[0]);
    hls.forEach((u, i) => streams.push({ id: `${idOrSlug}:hls${i}`, url: u }));
  });

  // Subtitles, if plainly exposed
  $('track[kind="subtitles"]').each((_, t) => {
    const sUrl = $(t).attr('src');
    const lang = $(t).attr('srclang') || $(t).attr('label') || 'und';
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

  const uniq = new Map();
  for (const s of streams) if (s.url) uniq.set(s.url, s);
  return [...uniq.values()];
}