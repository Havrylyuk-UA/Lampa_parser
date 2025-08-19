# UAserial Ready Pack (Vercel, без локального ПК)

## Що всередині
- `lib/uaserial.js` — парсер uaserial.top із підтримкою PROXY_BASE, кращим каталогом, iframe-потоками.
- `api/health.js`, `api/catalog.js`, `api/title.js`, `api/streams.js` — **query routes** (ніякої динаміки).
- `public/index.html`, `public/online_mod.js` — статичні ресурси і плагін для Lampa.
- `vercel.json` — мінімальні маршрути.

## Деплой
1. Залий у корінь GitHub-репозиторію.
2. Імпортуй у Vercel → Deploy.
3. (Опційно) додай ENV `PROXY_BASE` (напр. `https://your-worker.workers.dev/`) у Project → Settings → Environment Variables.

## Перевірка
- `/api/health`
- `/api/catalog?page=1`
- `/api/title?slug=dexter-resurrection/season-1`
- `/api/streams?slug=dexter-resurrection/season-1`

## Підключення до Lampa
У Lampa → Онлайн-моди → Додати посилання → `https://<твій>.vercel.app/online_mod.js`

> Потоки з’являться, якщо сторінка або її iframe відкрито віддають `.m3u8` або `<source src="...">`. Ми нічого не обходимо: тільки публічні дані.