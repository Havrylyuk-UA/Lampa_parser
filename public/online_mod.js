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

  function openCatalog(page = 1, q = '') {
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
      onSearch: (v) => openCatalog(1, v)
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
      Lampa.Menu.add({ title: 'UAserial', action: () => openCatalog(1, '') });
    }
  });
})();