export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const adapter = (env && env.UAS_ADAPTER) || 'https://lampa-parser-lime.vercel.app';
    if (url.pathname.startsWith('/api/')) {
      const target = adapter + url.pathname + (url.search || '');
      const init = { method: 'GET', headers: { 'Accept': 'application/json' } };
      return await fetch(target, init);
    }
    return new Response('UASerials worker: only /api/* is supported', { status: 200 });
  }
};