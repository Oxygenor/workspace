# qplaze-sync-worker

Окремий Node/Playwright-сервіс, який зчитує картки (лише `sourceId`, `title`,
`sourceUrl` — без описів, коментарів, виконавців, вкладень) з інстансу
Kanboard і синхронізує їх у Supabase-базу основного застосунку. Деплоїться
**окремо** від основного Vite-застосунку — Supabase Edge Functions працюють
на Deno і не можуть запускати справжній браузер, тож ця частина потребує
власного постійно запущеного Node-хоста.

Три способи запуску синхронізації, усі використовують один і той самий
оркестратор (`src/sync.js`):
1. Кнопка "Синхронізувати Qplaze" в застосунку → Supabase edge-функція
   `qplaze-sync-trigger` → `POST /sync` сюди.
2. Прямий `POST /sync` (захищений `SYNC_API_KEY`).
3. `node-cron`, кожні 15 хвилин, у самому процесі (`src/cron.js`).

Блокування паралельних запусків (`qplaze_sync_lock` у Postgres) гарантує,
що одночасно виконується лише одна синхронізація з усіх трьох джерел,
навіть після рестарту/редеплою.

## ⚠️ Застереження щодо селекторів

Селектори в `src/scrape.js` написані за стандартною версткою opensource-шаблонів
Kanboard, **не перевірені напряму на kanboard.qplaze.com** (не було живого
доступу під час розробки). Якщо форма входу, запит CAPTCHA/2FA чи розмітка
дошки/карток на твоєму інстансі виглядає інакше (кастомна тема, новіша/старіша
версія Kanboard), синхронізація безпечно завершиться помилкою
`error_code: 'structure_changed'` або `'login_failed'`, а не створить
неправильні дані — але, ймовірно, доведеться підправити константу `SELECTORS`
на початку `src/scrape.js` після першого реального запуску. Перевір рядок,
який він записав у `qplaze_sync_runs` (через застосунок або
`supabase db query`), щоб побачити, який саме `error_code` повернувся, потім
подивись на реальну сторінку (наприклад, запусти локально один раз з
`headless: false` у `scrape.js`, щоб побачити процес), щоб виправити селектор.

## Локальна розробка

```sh
npm install
npx playwright install --with-deps chromium   # потрібно лише поза Docker-образом
cp .env.example .env   # заповни реальними значеннями, ніколи не комітити цей файл
npm start
```

Або запустити одну синхронізацію без HTTP-сервера:

```sh
npm run sync-once
```

## Деплой на Railway

1. Новий проєкт Railway → "Deploy from GitHub repo", вказавши цей репозиторій,
   з **root directory = `worker/qplaze-sync`**. Railway автоматично визначить
   `Dockerfile` (конфіг `railway.json`/Nixpacks не потрібен).
   - Альтернатива: з середини цієї папки — `railway up` через Railway CLI.
2. Виставити змінні середовища у вкладці Variables на Railway (або
   `railway variables set KEY=value` через CLI) — повний список у
   `.env.example`. Ніколи не комітити реальні значення. `PORT` Railway
   підставляє автоматично.
3. Settings → Networking → "Generate Domain", щоб отримати публічний URL.
   Він стає секретом `QPLAZE_WORKER_URL` для edge-функції
   `qplaze-sync-trigger` (`supabase secrets set QPLAZE_WORKER_URL=...`) —
   фронтенд про нього ніколи не дізнається напряму.
4. Розклад кожні 15 хв виконується всередині цього самого постійно
   запущеного процесу (`src/cron.js`) — окремий Railway Cron Job не потрібен
   (вбудований cron Railway піднімає новий одноразовий контейнер на кожен
   запуск, що не підходить для довготривалого процесу Playwright/Express).
5. `GET /health` — для health-check Railway.

## Спостережуваність (Observability)

Кожен запуск записує один рядок у `qplaze_sync_runs` (прив'язаний до
workspace, доступний для читання із застосунку через RLS): час, статус,
лічильники found/created/updated/skipped/error. **Ніколи** — назви карток,
облікові дані, cookies чи токени: `error_code` завжди один з фіксованого
переліку (`login_failed | captcha_detected | structure_changed | lock_busy |
no_target_column | internal`), ніколи сирий текст помилки.
