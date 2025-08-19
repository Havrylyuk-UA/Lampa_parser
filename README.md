# UAserial Lampa Pack (без локального ПК-сервера)

Цей пак з двох частин:
1) **Serverless-адаптер** на Vercel (`/api/*`), який парсить `https://uaserial.top` і віддає JSON.
2) **Онлайн-мод Lampa** (`/online_mod.js`), який використовує цей адаптер.

## Швидкий запуск на Vercel
1. Створи репозиторій на GitHub і залий вміст цього архіву.
2. На https://vercel.com → Add New → Project → Import Git Repository → Deploy.
3. Отримаєш домен: `https://<project>.vercel.app`
4. У Lampa додай онлайн-мод за URL: `https://<project>.vercel.app/online_mod.js`

## Тест API
- `GET /api/catalog?page=1`
- `GET /api/title/<slug>`
- `GET /api/streams/<slug>`

## Нотатки
- Код не обходить DRM/логіни і використовує тільки те, що сайт віддає публічно.
- Якщо щось не парситься — підкрути селектори у `lib/uaserial.js`.