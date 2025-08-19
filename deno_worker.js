async function handle(request) {
  const url = new URL(request.url);
  const adapter = 'https://lampa-parser-lime.vercel.app';
  if (url.pathname.startsWith('/api/')) {
    const target = adapter + url.pathname + (url.search || '');
    return await fetch(target, { headers: { 'Accept': 'application/json' } });
  }
  return new Response('UASerials worker: only /api/* is supported', { status: 200 });
}
addEventListener('fetch', (event) => event.respondWith(handle(event.request)));