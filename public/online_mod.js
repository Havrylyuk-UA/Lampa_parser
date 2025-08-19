window.UASERIALS_NS = window.UASERIALS_NS || {};
(() => {
  const getBase = () => {
    try {
      return new URL(".", document.currentScript.src).origin;
    } catch {
      return "";
    }
  };
  const ADAPTER = getBase() || "https://<your-app>.vercel.app";

  const jget = async (u) => {
    const r = await fetch(u, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };

  function UAS_openCatalog(page = 1, q = "") {
    Lampa.Activity.push({
      title: q ? `Пошук: ${q}` : "UAserial",
      url: "",
      page,
      component: "category_full",
      onCreate: async function () {
        this.activity.loader(true);
        try {
          const items = await jget(
            `${ADAPTER}/api/catalog?page=${page}${
              q ? `&q=${encodeURIComponent(q)}` : ""
            }`
          );
          this.activity.loader(false);
          this.activity.render(
            items.map((it) => ({
              title: it.title,
              subtitle: it.year ? String(it.year) : "",
              poster: it.poster || "",
              onclick: () => openTitle(it.id),
            }))
          );
        } catch (e) {
          this.activity.loader(false);
          Lampa.Noty.show("Помилка каталогу");
        }
      },
      onSearch: (v) => UAS_openCatalog(1, v),
    });
  }

  async function openTitle(id) {
    try {
      const d = await jget(
        `${ADAPTER}/api/title?slug=${encodeURIComponent(id)}`
      );
      Lampa.Activity.push({
        title: d.title,
        url: "",
        component: "full",
        card: {
          title: d.title,
          original_title: d.title,
          release_year: d.year,
          img: d.poster,
          genres: (d.genres || []).join(", "),
          descr: d.description || "",
        },
        buttons: [{ title: "Відтворити", onclick: () => playStreams(id) }],
      });
    } catch {
      Lampa.Noty.show("Не вдалось відкрити сторінку");
    }
  }

  async function playStreams(id) {
    try {
      const streams = await jget(
        `${ADAPTER}/api/streams?slug=${encodeURIComponent(id)}`
      );
      if (!streams.length) return Lampa.Noty.show("Потоки не знайдені");
      if (streams.length > 1) {
        Lampa.Select.show({
          title: "Оберіть якість",
          items: streams.map((s) => ({ title: s.quality || "auto", data: s })),
          onSelect: (it) => startPlayer(it.data),
        });
      } else {
        startPlayer(streams[0]);
      }
    } catch {
      Lampa.Noty.show("Не вдалось отримати потоки");
    }
  }

  function startPlayer(stream) {
    Lampa.Player.play({
      title: "Відтворення",
      url: stream.url,
      subtitles: stream.subtitles || [],
      headers: stream.headers || {},
    });
    Lampa.Player.open();
  }

  Lampa.Listener.follow("app", (e) => {
    if (e.type === "ready") {
      // UAS: menu add moved to safeRegister
    }
  });
})();
// --- SAFE REGISTRATION / FALLBACK (auto-generated) ---
function UAS_safeRegister() {
  const open = () =>
    UAS_openCatalog
      ? UAS_openCatalog(1, "")
      : typeof openCatalog === "function"
      ? openCatalog(1, "")
      : null;

  try {
    if (
      typeof Lampa !== "undefined" &&
      Lampa.Menu &&
      typeof Lampa.Menu.add === "function"
    ) {
      // (UAS) Menu.add removed

      return;
    }
  } catch (e) {}

  // fallback: auto-open once
  if (typeof window !== "undefined" && !window.UAS___auto_opened) {
    window.UAS___auto_opened = true;
    setTimeout(() => {
      try {
        open();
      } catch (e) {}
      try {
        if (Lampa && Lampa.Noty)
          Lampa.Noty.show("UASerials: каталог відкрито (fallback)");
      } catch (e) {}
    }, 300);
  }
}

if (
  typeof Lampa !== "undefined" &&
  Lampa.Listener &&
  typeof Lampa.Listener.follow === "function"
) {
  Lampa.Listener.follow("app", (e) => {
    if (e && e.type === "ready") UAS_safeRegister();
  });
} else {
  // якщо Listener недоступний, пробуємо просто запустити після невеликої паузи
  setTimeout(() => {
    try {
      UAS_safeRegister();
    } catch (e) {}
  }, 500);
}

/* ===========================
 *  UASerials: кнопка на екрані тайтлу (fixed)
 * =========================== */
(function () {
  try {
    // ВАЖЛИВО: не посилатись на себе до оголошення
    const ADAPTER =
      typeof window !== "undefined" && window.UAS_ADAPTER
        ? window.UAS_ADAPTER
        : "https://lampa-parser-lime.vercel.app"; // ← підстав свій домен, якщо інший

    async function jget(u) {
      const r = await fetch(u, { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }

    // Пошук у твоєму адаптері
    async function findBestMatch(title, originalTitle, year) {
      const q = (title || originalTitle || "").trim();
      if (!q) return null;

      const items = await jget(
        `${ADAPTER}/api/catalog?page=1&q=${encodeURIComponent(q)}`
      );
      if (!Array.isArray(items) || !items.length) return null;

      const lc = (s) => (s || "").toLowerCase();
      const t = lc(title);
      const ot = lc(originalTitle);

      let best = null,
        bestScore = -1;
      for (const it of items) {
        const itTitle = lc(it.title);
        let score = 0;
        if (year && it.year && Number(it.year) === Number(year)) score += 3;
        if (itTitle === t || itTitle === ot) score += 3;
        if (t && itTitle.includes(t)) score += 1;
        if (ot && itTitle.includes(ot)) score += 1;
        if (score > bestScore) {
          bestScore = score;
          best = it;
        }
      }
      return best || items[0];
    }

    async function playByMeta(meta) {
      try {
        const title =
          meta?.name ||
          meta?.title ||
          meta?.original_title ||
          meta?.original_name ||
          "";
        const originalTitle = meta?.original_title || meta?.original_name || "";
        const year =
          meta?.release_year ||
          meta?.year ||
          (meta?.release_date || "").slice(0, 4);

        const found = await findBestMatch(title, originalTitle, year);
        if (!found)
          return Lampa?.Noty?.show("UASerials: не знайдено в каталозі");

        const streams = await jget(
          `${ADAPTER}/api/streams?slug=${encodeURIComponent(found.id)}`
        );
        if (!streams.length)
          return Lampa?.Noty?.show("UASerials: потоки не знайдені");

        if (streams.length > 1 && Lampa?.Select) {
          Lampa.Select.show({
            title: "UASerials — оберіть якість",
            items: streams.map((s) => ({
              title: s.quality || "auto",
              data: s,
            })),
            onSelect: (it) => startPlayer(it.data),
          });
        } else {
          startPlayer(streams[0]);
        }
      } catch (e) {
        Lampa?.Noty?.show("UASerials: " + (e?.message || "помилка"));
      }
    }

    function startPlayer(stream) {
      try {
        Lampa?.Player?.play?.({
          title: "UASerials",
          url: stream.url,
          subtitles: stream.subtitles || [],
          headers: stream.headers || {},
        });
        Lampa?.Player?.open?.();
      } catch (e) {
        Lampa?.Noty?.show("UASerials: не вдалось запустити плеєр");
      }
    }

    function injectButton(container, meta) {
      if (!container || container.querySelector(".uas-btn")) return;

      const btn = document.createElement("div");
      btn.className = "button selector uas-btn";
      btn.style.display = "inline-flex";
      btn.style.alignItems = "center";
      btn.style.gap = "8px";
      btn.style.padding = "10px 16px";
      btn.style.borderRadius = "14px";
      btn.style.fontWeight = "600";

      const icon = document.createElement("span");
      icon.textContent = "▶";
      const text = document.createElement("span");
      text.textContent = "UASerials (uaserial.top)";

      btn.appendChild(icon);
      btn.appendChild(text);
      btn.addEventListener("click", () => playByMeta(meta));

      container.appendChild(btn);
    }

    // Шукаємо «екран деталей» і блок дій
    const observer = new MutationObserver(() => {
      try {
        const full = document.querySelector(
          '.full, .card-full, [data-component="full"]'
        );
        if (!full) return;
        const actions = full.querySelector(
          ".full__buttons, .buttons, .full-actions, .full__actions, .card-actions"
        );
        const meta = full.__card || window.card || window.movie || {};
        if (actions) injectButton(actions, meta);
      } catch (e) {}
    });
    observer.observe(document.body, { childList: true, subtree: true });

    if (
      typeof Lampa !== "undefined" &&
      Lampa.Listener &&
      typeof Lampa.Listener.follow === "function"
    ) {
      Lampa.Listener.follow("full", (e) => {
        if (e && (e.type === "build" || e.type === "open")) {
          const root = document.querySelector(
            '.full, .card-full, [data-component="full"]'
          );
          const actions = root?.querySelector(
            ".full__buttons, .buttons, .full-actions, .full__actions, .card-actions"
          );
          injectButton(actions, e?.object || {});
        }
      });
    }
  } catch (e) {
    // не завалюємо мод при винятках
    try {
      Lampa &&
        Lampa.Noty &&
        Lampa.Noty.show("UASerials (init): " + (e.message || "error"));
    } catch (_) {}
  }
})();
/* =========================================
 *  UASerials: кнопка на екрані тайтлу (web/Lampa)
 * ========================================= */
(function(){
  try {
    const UAS_DEBUG = !!(window && window.UAS_DEBUG);
    const log = (...a)=>{ try{ if(UAS_DEBUG) console.log('[UAS]', ...a); }catch(_){ } };

    const ADAPTER = 'https://lampa-parser-lime.vercel.app';

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

    async function playByMeta(meta){
      try{
        const title = meta?.name || meta?.title || meta?.original_title || meta?.original_name || '';
        const originalTitle = meta?.original_title || meta?.original_name || '';
        const year = meta?.release_year || meta?.year || (meta?.release_date || '').slice?.(0,4);

        log('meta:', {title, originalTitle, year});
        const found = await findBestMatch(title, originalTitle, year);
        if(!found) return Lampa?.Noty?.show('UASerials: не знайдено в каталозі');

        const streams = await jget(`${ADAPTER}/api/streams?slug=${encodeURIComponent(found.id)}`);
        log('streams:', streams);
        if(!streams.length) return Lampa?.Noty?.show('UASerials: потоки не знайдені');

        if(streams.length > 1 && Lampa?.Select){
          Lampa.Select.show({
            title: 'UASerials — оберіть якість',
            items: streams.map(s => ({ title: s.quality || 'auto', data: s })),
            onSelect: (it) => startPlayer(it.data)
          });
        } else {
          startPlayer(streams[0]);
        }
      } catch(e){
        log('play error:', e);
        Lampa?.Noty?.show('UASerials: '+(e?.message || 'помилка'));
      }
    }

    function startPlayer(stream){
      try{
        Lampa?.Player?.play?.({
          title: 'UASerials',
          url: stream.url,
          subtitles: stream.subtitles || [],
          headers: stream.headers || {}
        });
        Lampa?.Player?.open?.();
      } catch(e){
        log('player error:', e);
        Lampa?.Noty?.show('UASerials: не вдалось запустити плеєр');
      }
    }

    function makeBtn(meta){
      const btn = document.createElement('div');
      btn.className = 'button selector uas-btn';
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.gap = '8px';
      btn.style.padding = '10px 16px';
      btn.style.borderRadius = '14px';
      btn.style.fontWeight = '600';
      btn.style.whiteSpace = 'nowrap';

      const icon = document.createElement('span'); icon.textContent = '▶';
      const text = document.createElement('span'); text.textContent = 'UASerials (uaserial.top)';

      btn.appendChild(icon); btn.appendChild(text);
      btn.addEventListener('click', () => playByMeta(meta));
      return btn;
    }

    function injectButton(actions, meta){
      if(!actions || actions.querySelector('.uas-btn')) return false;
      const btn = makeBtn(meta);
      const play = actions.querySelector('.button[data-action="play"], .button.play, .full__button_play');
      if(play && play.parentElement) play.parentElement.insertBefore(btn, play);
      else actions.appendChild(btn);
      log('button injected');
      return true;
    }

    function resolveMeta(){
      try{
        if (typeof Lampa !== 'undefined' && Lampa.Activity && typeof Lampa.Activity.get === 'function'){
          const act = Lampa.Activity.get();
          const m = act?.card || act?.object || act?.data || null;
          if(m) return m;
        }
        const full = document.querySelector('.full, .card-full, [data-component="full"]');
        if(full && full.__card) return full.__card;

        const title = document.querySelector('.full-title, .full__title, .card-title, h1')?.textContent?.trim();
        const yTxt  = document.querySelector('.full__tag, .full-info, .year')?.textContent || '';
        const year  = (yTxt.match(/\b(19|20)\d{2}\b/)||[])[0];
        if(title) return { title, year };
      }catch(_){}
      return null;
    }

    function findActionsContainer(){
      const full = document.querySelector('.full, .card-full, [data-component="full"]');
      if(!full) return null;
      return full.querySelector(
        '.full__buttons, .buttons, .full-actions, .full__actions, .card-actions, .full__controls'
      );
    }

    const observer = new MutationObserver(()=>{
      try{
        const actions = findActionsContainer();
        if(!actions) return;
        const meta = resolveMeta();
        if(!meta) return;
        injectButton(actions, meta);
      }catch(_){}
    });
    observer.observe(document.body, { childList:true, subtree:true });

    if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function'){
      Lampa.Listener.follow('full',(e)=>{
        if(e && (e.type === 'build' || e.type === 'open' || e.type === 'render')){
          const actions = findActionsContainer();
          injectButton(actions, e?.object || resolveMeta() || {});
        }
      });
    }

    if (location.search.includes('card=')){
      setTimeout(()=>{
        const actions = findActionsContainer();
        injectButton(actions, resolveMeta() || {});
      }, 600);
    }
  } catch(e){
    try { Lampa && Lampa.Noty && Lampa.Noty.show('UASerials (init): '+(e.message||'error')); } catch(_){}
  }
})();
