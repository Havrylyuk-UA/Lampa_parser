
/* =========================================================
 *  UASerials — Lampa plugin (GitHub Pages build)
 *  - Registers in MODS’s if available; otherwise injects a button near Play
 *  - On click: searches adapter (catalog), fetches streams, starts Lampa.Player
 *  - No Lampa.Component, no Lampa.Menu.add
 * ========================================================= */
(function(){
  const UAS_ADAPTER = (typeof window !== 'undefined' && window.UAS_ADAPTER)
    ? window.UAS_ADAPTER
    : 'https://lampa-parser-lime.vercel.app';

  async function UAS_fetchJSON(url){
    const r = await fetch(url, { headers: { 'Accept':'application/json' } });
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }

  function UAS_toPlaylist(streams){
    return (streams||[]).map(s => ({
      title: s.quality ? `UASerials • ${s.quality}` : 'UASerials',
      url: s.url,
      quality: s.quality || 'auto',
      subtitles: s.subtitles || [],
      headers: s.headers || {}
    }));
  }

  async function UAS_findBestMatch(title, originalTitle, year){
    const q = (title || originalTitle || '').trim();
    if(!q) return null;
    const items = await UAS_fetchJSON(`${UAS_ADAPTER}/api/catalog?page=1&q=${encodeURIComponent(q)}`);
    if(!Array.isArray(items) || !items.length) return null;

    const lc = s => (s||'').toLowerCase();
    const t  = lc(title);
    const ot = lc(originalTitle);

    let best=null, score=-1;
    for(const it of items){
      const itTitle = lc(it.title);
      let sc = 0;
      if(year && it.year && Number(it.year) === Number(year)) sc += 3;
      if(itTitle === t || itTitle === ot) sc += 3;
      if(t && itTitle.includes(t)) sc += 1;
      if(ot && itTitle.includes(ot)) sc += 1;
      if(sc > score){ score = sc; best = it; }
    }
    return best || items[0];
  }

  async function UAS_runForCard(card){
    try{
      Lampa?.Noty?.show?.('UASerials: шукаю…');
      const title = card?.name || card?.title || card?.original_title || card?.original_name || '';
      const original = card?.original_title || card?.original_name || '';
      const year = card?.release_year || card?.year || (card?.release_date || '').slice?.(0,4);

      const found = await UAS_findBestMatch(title, original, year);
      if(!found) return Lampa?.Noty?.show?.('UASerials: не знайдено в каталозі');

      const streams = await UAS_fetchJSON(`${UAS_ADAPTER}/api/streams?slug=${encodeURIComponent(found.id)}`);
      if(!Array.isArray(streams) || !streams.length){
        return Lampa?.Noty?.show?.('UASerials: потоки не знайдені');
      }

      const playlist = UAS_toPlaylist(streams);
      if (Lampa?.Player?.playlist) Lampa.Player.playlist(playlist);
      Lampa?.Player?.play?.(playlist[0]);
      Lampa?.Player?.open?.();
    } catch(e){
      Lampa?.Noty?.show?.('UASerials: '+(e?.message || 'помилка'));
    }
  }

  function UAS_registerMods(card){
    if (Lampa?.Online && typeof Lampa.Online.add === 'function'){
      Lampa.Online.add({
        title: 'UASerials (uaserial.top)',
        onClick: () => UAS_runForCard(card)
      });
      return true;
    }
    return false;
  }

  function UAS_injectDirectButton(card){
    const full = document.querySelector('.full, .card-full, [data-component="full"]');
    if(!full) return false;
    const actions = full.querySelector('.full__buttons, .buttons, .full-actions, .full__actions, .card-actions, .full__controls');
    if(!actions || actions.querySelector('.uas-btn')) return false;

    const btn = document.createElement('div');
    btn.className = 'button selector uas-btn';
    btn.style.display='inline-flex'; btn.style.alignItems='center'; btn.style.gap='8px';
    btn.style.padding='10px 16px'; btn.style.borderRadius='14px'; btn.style.fontWeight='600';
    btn.appendChild(Object.assign(document.createElement('span'),{textContent:'▶'}));
    btn.appendChild(Object.assign(document.createElement('span'),{textContent:'UASerials (uaserial.top)'}));
    btn.addEventListener('click', () => UAS_runForCard(card));

    const play = actions.querySelector('.button[data-action="play"], .button.play, .full__button_play');
    if(play && play.parentElement) play.parentElement.insertBefore(btn, play);
    else actions.appendChild(btn);
    return true;
  }

  function UAS_onTitleOpen(card){
    const ok = UAS_registerMods(card);
    if(!ok) UAS_injectDirectButton(card);
  }

  if (Lampa?.Listener?.follow){
    Lampa.Listener.follow('full', (e)=>{
      if(e && (e.type==='open' || e.type==='build' || e.type==='render')){
        UAS_onTitleOpen(e.object || {});
      }
    });
  }

  const mo = new MutationObserver(()=>{
    const full = document.querySelector('.full, .card-full, [data-component="full"]');
    if(full && !full.__uas_hooked){
      full.__uas_hooked = true;
      UAS_onTitleOpen(full.__card || window.card || window.movie || {});
    }
  });
  mo.observe(document.body, { childList:true, subtree:true });

  if (location.search.includes('card=')){
    setTimeout(()=> UAS_onTitleOpen(window.card || window.movie || {}), 800);
  }
})();
