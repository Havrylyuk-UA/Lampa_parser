
# UASerials — Lampa Plugin (GitHub Pages)

Простий спосіб підключити мод без Vercel. Потрібен лише статичний хостинг файлу `online_mod.js`.

## Кроки публікації

1. Створи новий репозиторій на GitHub (наприклад, `lampa-uaserials`).
2. Завантаж цей вміст (`online_mod.js`, `index.html`, `README.md`) у корінь репозиторію (branch `main`).
3. Перейди в **Settings → Pages**:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
   - Save.
4. Через хвилину-дві отримаєш посилання виду:  
   `https://<твій-юзер>.github.io/<твій-репо>/online_mod.js`
5. Додай його у Lampa → Налаштування → Онлайн-моди.

> За замовчуванням мод ходить у адаптер `https://lampa-parser-lime.vercel.app`. Якщо потрібен інший — відредагуй константу `UAS_ADAPTER` у `online_mod.js` або задай `window.UAS_ADAPTER`.
