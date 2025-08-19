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
      Lampa.Menu.add({ title: "🎬 UASerials (uaserial.top)", action: open });
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
 *  UASerials: кнопка на екрані тайтлу
 * =========================== */

(function () {
  const UAS_ADAPTER =
    typeof UAS_ADAPTER === "string"
      ? UAS_ADAPTER
      : "https://lampa-parser-lime.vercel.app";

  async function UAS_jget(u) {
    const r = await fetch(u, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  // Пошук найкращого збігу в адаптері за назвою/оригінальною назвою і роком
  async function UAS_findBestMatch(title, originalTitle, year) {
    const q = (title || originalTitle || "").trim();
    if (!q) return null;

    const items = await UAS_jget(
      `${UAS_ADAPTER}/api/catalog?page=1&q=${encodeURIComponent(q)}`
    );
    if (!Array.isArray(items) || !items.length) return null;

    // Проста евристика: спочатку повний збіг за роком, потім – частковий
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
      if (itTitle.includes(t) || itTitle.includes(ot)) score += 1;

      if (score > bestScore) {
        bestScore = score;
        best = it;
      }
    }
    return best || items[0];
  }

  async function UAS_playByMeta(meta) {
    try {
      const title =
        meta?.name ||
        meta?.title ||
        meta?.original_title ||
        meta?.original_name ||
        "";
      const originalTitle = meta?.original_title || meta?.original_name || "";
      const year =
        meta?.release_year || meta?.year || meta?.release_date?.slice?.(0, 4);

      const found = await UAS_findBestMatch(title, originalTitle, year);
      if (!found) {
        Lampa?.Noty?.show("UASerials: Не знайдено в каталозі");
        return;
      }

      const streams = await UAS_jget(
        `${UAS_ADAPTER}/api/streams?slug=${encodeURIComponent(found.id)}`
      );
      if (!streams.length) {
        Lampa?.Noty?.show("UASerials: Потоки не знайдені");
        return;
      }

      // Вибір якості, якщо їх кілька
      if (streams.length > 1 && Lampa?.Select) {
        Lampa.Select.show({
          title: "UASerials — оберіть якість",
          items: streams.map((s) => ({ title: s.quality || "auto", data: s })),
          onSelect: (it) => UAS_startPlayer(it.data),
        });
      } else {
        UAS_startPlayer(streams[0]);
      }
    } catch (e) {
      Lampa?.Noty?.show("UASerials: помилка відтворення");
    }
  }

  function UAS_startPlayer(stream) {
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

  // Інʼєкція кнопки у блок дій сторінки тайтлу
  function UAS_injectButton(container, meta) {
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
    icon.textContent = "▶"; // мінімалістична іконка
    const text = document.createElement("span");
    text.textContent = "UASerials (uaserial.top)";

    btn.appendChild(icon);
    btn.appendChild(text);
    btn.addEventListener("click", () => UAS_playByMeta(meta));

    container.appendChild(btn);
  }

  // Спостерігач за появою екрана "деталі"
  const UAS_observer = new MutationObserver(() => {
    try {
      const full = document.querySelector(
        '.full, .card-full, [data-component="full"]'
      );
      if (!full) return;

      // Блок кнопок на екрані деталей (у різних збірках клас може різнитись)
      const actions = full.querySelector(
        ".full__buttons, .buttons, .full-actions, .full__actions, .card-actions"
      );
      // Витягуємо meta з Lampa, якщо є
      const meta = (full && full.__card) || window.card || window.movie || {};
      if (actions) UAS_injectButton(actions, meta);
    } catch (e) {}
  });

  // Стартуємо спостерігача і дублюємо через події Lampa, якщо вони є
  UAS_observer.observe(document.body, { childList: true, subtree: true });

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
        UAS_injectButton(actions, e?.object || {});
      }
    });
  }
})();
