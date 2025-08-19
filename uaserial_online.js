/**
 * UAserial Online (for Lampa)
 * Плагін для роботи з адаптером (serverless) під uaserial.top
 * Базовий адаптер: https://lampa-parser.vercel.app (зміни на свій у змінній ADAPTER нижче)
 */
(function () {
  'use strict';

  const ADAPTER = 'https://lampa-parser.vercel.app'; // ← за потреби заміни на свій домен Vercel

  async function jget(url) {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  function showCatalog(page = 1, q = '') {
    Lampa.Activity.push({
      title: q ? 'Пошук: ' + q : 'UAserial',
      url: '',
      page,
      component: 'category_full',
      onCreate: async function() {
        this.activity.loader(true);
        try {
          const items = await jget(ADAPTER + '/api/catalog?page=' + page + (q ? '&q=' + encodeURIComponent(q) : ''));
          this.activity.loader(false);
          // перетворимо в картки Lampa
          const cards = items.map(it => ({
            title: it.title,
            subtitle: it.year ? String(it.year) : '',
            poster: it.poster || '',
            onclick: () => openTitle(it.id)
          }));
          this.activity.render(cards);
        } catch (e) {
          this.activity.loader(false);
          Lampa.Noty.show('Помилка каталогу: ' + (e.message || ''));
        }
      },
      onSearch: (v) => showCatalog(1, v)
    });
  }

  async function openTitle(id) {
    try {
      const d = await jget(ADAPTER + '/api/title/' + id);
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
    } catch (e) {
      Lampa.Noty.show('Не вдалось відкрити сторінку: ' + (e.message || ''));
    }
  }

  async function playStreams(id) {
    try {
      const streams = await jget(ADAPTER + '/api/streams/' + id);
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
    } catch (e) {
      Lampa.Noty.show('Не вдалось отримати потоки: ' + (e.message || ''));
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

  // Реєструємо пункт меню
  Lampa.Listener.follow('app', (e) => {
    if (e.type === 'ready') {
      Lampa.Menu.add({
        title: 'UAserial (adapter)',
        action: () => showCatalog(1, '')
      });
    }
  });

})();