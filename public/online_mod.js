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
      // (UAS) Menu.add removed

    }
  });
})();
/* =========================================
 *  UASerials: інтеграція з "MODS's" (online panel)
 *  - Реєстрація в панелі MODS’s через Lampa.Online.add (якщо є)
 *  - Fallback: відкриття власного Component з Play
 * ========================================= */
(function(){
  try {
    const ADAPTER = (window && window.UAS_ADAPTER) || 'https://lampa-parser-lime.vercel.app';

    async function jget(u){
      const r = await fetch(u, { headers: { 'Accept': 'application/json' } });
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    }

    async function findBestMatch(title, originalTitle, year){
      const q = (title || originalTitle || '').trim();
      if(!q) return null;
      const items = await jget(`${ADAPTER}/api/catalog?page=1&q=${encodeURIComponent(q)}`);
      if(!Array.isArray(items) || !items.length) return null;

      const lc = s => (s||'').toLowerCase();
      const t  = lc(title);
      const ot = lc(originalTitle);

      let best = null, bestScore = -1;
      for(const it of items){
        const itTitle = lc(it.title);
        let score = 0;
        if(year && it.year && Number(it.year) === Number(year)) score += 3;
        if(itTitle === t || itTitle === ot) score += 3;
        if(t && itTitle.includes(t)) score += 1;
        if(ot && itTitle.includes(ot)) score += 1;
        if(score > bestScore){ bestScore = score; best = it; }
      }
      return best || items[0];
    }

    function makeOnlineItem(found){
      return {
        title: found.title || 'UASerials',
        quality: found.quality || 'auto',
        card: { title: found.title, poster: found.poster || '' },
        file: async function(cb){
          try{
            const streams = await jget(`${ADAPTER}/api/streams?slug=${encodeURIComponent(found.id)}`);
            if(!streams || !streams.length){
              return (Lampa && Lampa.Noty && Lampa.Noty.show('UASerials: потоки не знайдені'));
            }
            const qualitys = {};
            streams.forEach(s => { if(s.quality) qualitys[s.quality] = s.url; });
            const first = streams[0];
            cb({ file: first.url, quality: qualitys });
          } catch(e){
            Lampa && Lampa.Noty && Lampa.Noty.show('UASerials: помилка потоку');
          }
        }
      };
    }

    function openComponentForCard(card){
      const component = new Lampa.Component('online_mod_uaserials');
      component.create = function(){
        this.activity.loader(true);
        (async () => {
          try{
            const title = card?.name || card?.title || card?.original_title || card?.original_name || '';
            const originalTitle = card?.original_title || card?.original_name || '';
            const year = card?.release_year || card?.year || (card?.release_date || '').slice?.(0,4);

            const found = await findBestMatch(title, originalTitle, year);
            if(!found){
              this.activity.loader(false);
              this.activity.empty('UASerials: не знайдено у каталозі');
              return;
            }

            const items = [ makeOnlineItem(found) ];
            this.activity.loader(false);
            this.activity.render(items);
          } catch(e){
            this.activity.loader(false);
            this.activity.empty('UASerials: помилка пошуку');
          }
        })();
      };

      Lampa.Activity.push({
        component: component,
        source: 'uaserials',
        title: 'UASerials (uaserial.top)'
      });
    }

    if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function'){
      Lampa.Listener.follow('full', (e)=>{
        if(!e || (e.type!=='open' && e.type!=='build')) return;
        const card = e.object || {};

        if (Lampa.Online && typeof Lampa.Online.add === 'function'){
          Lampa.Online.add({
            title: 'UASerials (uaserial.top)',
            onClick: () => openComponentForCard(card)
          });
        } else {
          openComponentForCard(card);
        }
      });
    }
  } catch(e){
    try { Lampa && Lampa.Noty && Lampa.Noty.show('UASerials (init): '+(e.message||'error')); } catch(_){}
  }
})();
