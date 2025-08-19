window.UASERIALS_NS = window.UASERIALS_NS || {};
(()=>{
  const getBase = () => {
    try { return new URL('.', document.currentScript.src).origin; }
    catch { return ''; }
  };
  const ADAPTER = getBase() || 'https://<your-app>.vercel.app';

  const jget = async (u) => {
    const r = await fetch(u, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };

  function UAS_openCatalog(page = 1, q = '') {
    Lampa.Activity.push({
      title: q ? `Пошук: ${q}` : 'UAserial',
      url: '',
      page,
      component: 'category_full',
      onCreate: async function() {
        this.activity.loader(true);
        try {
          const items = await jget(`${ADAPTER}/api/catalog?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
          this.activity.loader(false);
          this.activity.render(items.map(it => ({
            title: it.title,
            subtitle: it.year ? String(it.year) : '',
            poster: it.poster || '',
            onclick: () => openTitle(it.id)
          })));
        } catch (e) {
          this.activity.loader(false);
          Lampa.Noty.show('Помилка каталогу');
        }
      },
      onSearch: (v) => UAS_openCatalog(1, v)
    });
  }

  async function openTitle(id) {
    try {
      const d = await jget(`${ADAPTER}/api/title?slug=${encodeURIComponent(id)}`);
      Lampa.Activity.push({
        title: d.title,
        url: '',
        component: 'full',
        card: {
          title: d.title,
          original_title: d.title,
          release_year: d.year,
          img: d.poster,
          genres: (d.genres || []).join(', '),
          descr: d.description || ''
        },
        buttons: [{ title: 'Відтворити', onclick: () => playStreams(id) }]
      });
    } catch {
      Lampa.Noty.show('Не вдалось відкрити сторінку');
    }
  }

  async function playStreams(id) {
    try {
      const streams = await jget(`${ADAPTER}/api/streams?slug=${encodeURIComponent(id)}`);
      if (!streams.length) return Lampa.Noty.show('Потоки не знайдені');
      if (streams.length > 1) {
        Lampa.Select.show({
          title: 'Оберіть якість',
          items: streams.map(s => ({ title: s.quality || 'auto', data: s })),
          onSelect: (it) => startPlayer(it.data)
        });
      } else {
        startPlayer(streams[0]);
      }
    } catch {
      Lampa.Noty.show('Не вдалось отримати потоки');
    }
  }

  function startPlayer(stream) {
    Lampa.Player.play({
      title: 'Відтворення',
      url: stream.url,
      subtitles: stream.subtitles || [],
      headers: stream.headers || {}
    });
    Lampa.Player.open();
  }

  Lampa.Listener.follow('app', (e) => {
    if (e.type === 'ready') {
      // UAS: menu add moved to safeRegister

    }
  });
})();
// --- SAFE REGISTRATION / FALLBACK (auto-generated) ---
  function UAS_safeRegister() {
    const open = () => UAS_openCatalog ? UAS_openCatalog(1, '') : (typeof openCatalog === 'function' ? openCatalog(1, '') : null);

    try {
      if (typeof Lampa !== 'undefined' && Lampa.Menu && typeof Lampa.Menu.add === 'function') {
        Lampa.Menu.add({ title: '🎬 UASerials (uaserial.top)', action: open });
        return;
      }
    } catch (e) {}

    // fallback: auto-open once
    if (typeof window !== 'undefined' && !window.UAS___auto_opened) {
      window.UAS___auto_opened = true;
      setTimeout(() => {
        try { open(); } catch (e) {}
        try { if (Lampa && Lampa.Noty) Lampa.Noty.show('UASerials: каталог відкрито (fallback)'); } catch (e) {}
      }, 300);
    }
  }

  if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
    Lampa.Listener.follow('app', (e) => {
      if (e && e.type === 'ready') UAS_safeRegister();
    });
  } else {
    // якщо Listener недоступний, пробуємо просто запустити після невеликої паузи
    setTimeout(() => { try { UAS_safeRegister(); } catch (e) {} }, 500);
  }
