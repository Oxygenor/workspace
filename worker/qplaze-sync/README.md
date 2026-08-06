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

## Як влаштований сам скрапінг

`kanboard.qplaze.com` — це, попри назву, **не** opensource-проєкт kanboard.org,
а кастомний застосунок на Laravel + Inertia.js (Vue). Важливий наслідок:
кожна сторінка Inertia вбудовує атрибут `data-page` з повним JSON-описом
`{ component, props }` того, що на ній рендериться — і сторінка дошки
(`Boards/Show`) містить весь список колонок і карток прямо в
`props.board.lists[].cards[]`. Тому `src/scrape.js` **не парсить HTML/CSS
розмітку карток узагалі** — після логіну він просто читає ці структуровані
дані напряму. Це набагато надійніше за DOM-селектори (не ламається від
дрібних змін верстки/теми) і водночас означає, що серверний рендер картки
(`title`, `id`) ніколи не потрапляє в лог — усе фільтрується ще на етапі
`extractCards()`.

Єдине місце, де все ж є DOM-селектори — сама форма входу (`input#email`,
`input#password`, кнопка сабміту) та детектори CAPTCHA/2FA. Якщо вхід колись
зміниться (інша сторінка логіну, інша структура форми), синхронізація
безпечно впаде з `error_code: 'login_failed'`/`'structure_changed'`, а не
створить неправильні дані — перевіряй `qplaze_sync_runs` (через застосунок
або `supabase db query`) для діагностики.

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
