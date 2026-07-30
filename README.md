# Workspace

Універсальний конструктор особистого робочого простору: розділи з необмеженою вкладеністю, канбан-дошки, нотатки, таблиці, списки завдань і календарі. React SPA (Vite) + Supabase (Postgres, Auth, Storage, RLS). Розміщення — Vercel.

## Технологічний стек

- **Frontend**: React 19, TypeScript, Vite, React Router, Tailwind CSS, shadcn/ui-style компоненти, Lucide React, TanStack Query, Zustand (лише локальний UI-стан), React Hook Form + Zod, dnd-kit.
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Row Level Security).
- **Розгортання**: Vercel (статичний білд `dist/` + SPA rewrite).

## 1. Локальний запуск

```bash
npm install
cp .env.example .env
# заповніть .env значеннями зі свого проєкту Supabase (крок 2)
npm run dev
```

Застосунок буде доступний на `http://localhost:5173`. Без заповненого `.env` застосунок покаже екран «Потрібне налаштування Supabase» замість білого екрана.

Інші корисні команди:

```bash
npm run build      # production-білд у dist/
npm run preview    # локальний перегляд production-білду
npm run test       # запуск тестів (Vitest)
npm run lint       # лінтер (oxlint)
```

## 2. Створення проєкту Supabase

1. Зареєструйтеся на [supabase.com](https://supabase.com) та натисніть **New project**.
2. Оберіть організацію, назву проєкту, пароль бази даних і регіон, дочекайтеся ініціалізації проєкту.
3. У розділі **Project Settings → API** скопіюйте:
   - **Project URL** → `VITE_SUPABASE_URL`;
   - **anon public** ключ → `VITE_SUPABASE_ANON_KEY`.
4. **Ніколи** не використовуйте `service_role` ключ у фронтенді — лише `anon public`.

## 3. Застосування SQL-міграцій

Усі таблиці, enum-типи, тригери, RPC-функції та RLS-політики визначені у файлах `supabase/migrations/*.sql`, у порядку виконання (`0001` → `0008`). Ручне створення таблиць через Dashboard не потрібне.

### Варіант А — через Supabase Dashboard (найпростіше)

1. Відкрийте свій проєкт → **SQL Editor**.
2. Відкривайте файли `supabase/migrations/` по черзі, в порядку номерів (`0001_extensions_and_enums.sql` → `0008_power_features.sql`), вставляйте вміст у SQL Editor і виконуйте **Run** для кожного файлу послідовно.

### Варіант Б — через Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### Створення Storage buckets

Buckets `avatars` (публічний) та `attachments` (приватний, доступ лише учасникам workspace) і всі їхні Storage Policies створюються автоматично міграцією `0005_storage.sql` — окремих ручних дій у Dashboard не потрібно.

### Локальна розробка з Supabase CLI (опційно)

```bash
supabase start   # піднімає локальний Postgres + Auth + Storage в Docker
supabase db reset  # застосовує всі migrations + supabase/seed.sql
```

## 4. Демонстраційні дані

Ручний seed не потрібен. Одразу після реєстрації нового користувача тригер `handle_new_user()` автоматично створює:

- профіль користувача;
- особистий Workspace з роллю `owner`;
- демо-структуру `Розробка ігор → Проєкти → HTML5 Games → Канбан проєктів` з колонками «Нові / У роботі / На тестуванні / На погодженні / Завершено».

## 5. Змінні середовища

| Змінна | Опис |
| --- | --- |
| `VITE_SUPABASE_URL` | URL проєкту Supabase |
| `VITE_SUPABASE_ANON_KEY` | Публічний (anon) ключ Supabase |

Ніколи не комітьте файл `.env` у Git (він уже в `.gitignore`) і ніколи не додавайте `SUPABASE_SERVICE_ROLE_KEY` у фронтенд-код чи змінні середовища Vite.

## 6. Розгортання на Vercel

1. Заштовхніть репозиторій у GitHub/GitLab/Bitbucket.
2. На [vercel.com](https://vercel.com) натисніть **Add New → Project** і оберіть репозиторій.
3. Vercel автоматично визначить Vite-проєкт. Перевірте:
   - **Build Command**: `npm run build`;
   - **Output Directory**: `dist`.
4. У розділі **Environment Variables** додайте `VITE_SUPABASE_URL` та `VITE_SUPABASE_ANON_KEY` (значення з кроку 2).
5. Натисніть **Deploy**.
6. Файл `vercel.json` вже містить SPA-rewrite (`/* → /index.html`), тому прямі посилання на кшталт `/app/item/<id>` працюватимуть коректно після деплою.

### Оновлення production-змінних пізніше

**Project Settings → Environment Variables** у Vercel → додайте/змініть значення → **Redeploy**.

## 7. Структура проєкту

```
src/
  app/            # кореневий App.tsx і провайдери
  components/     # спільні UI-компоненти (shadcn-style примітиви в components/ui)
  features/       # бізнес-логіка за доменами (auth, workspace, workspace-tree, kanban,
                  # cards, notes, tables, tasks, calendar, profile, search, favorites, activity)
  hooks/          # спільні React-хуки
  layouts/        # AppLayout, AuthLayout
  lib/            # supabase client, tanstack query client, modules registry, валідації
  pages/          # тонкі route-компоненти
  routes/         # router.tsx, ProtectedRoute
  stores/         # zustand-стори (тема, UI, kanban-фільтри)
  types/          # типи бази даних
  i18n/           # усі текстові рядки інтерфейсу (uk.ts)

supabase/
  migrations/     # послідовні SQL-міграції
  seed.sql
```

Додавання нового типу модуля (наприклад, CRM чи фінанси) не вимагає змін у дереві розділів чи навігації — достатньо зареєструвати новий тип у `src/lib/modules/registry.tsx`.

## 7.1. Необов'язкові інтеграції: Telegram-дайджест і ICS-фід календаря

У профілі (`/app/settings/profile`) є розділ «Інтеграції» — щоденний дайджест у Telegram і посилання-підписка на календар (Google/Apple/Outlook). Це працює через Supabase Edge Functions, яких немає у базовій БД-міграції, тож їх треба розгорнути окремо. Повна інструкція — у `supabase/functions/README.md` (створення бота через @BotFather, `supabase functions deploy`, налаштування `pg_cron` для щоденної розсилки). Без цього кроку решта застосунку працює повністю — це необов'язкове доповнення.

## 8. Безпека

- Row Level Security увімкнено на всіх таблицях у схемі `public` — користувач бачить лише ті Workspace, де він є учасником `workspace_members`.
- Фронтенд ніколи не використовує `service_role` ключ.
- Storage-політики обмежують доступ до вкладень учасниками відповідного Workspace, а аватари — власним користувачем на запис.

## 9. Тести

```bash
npm run test
```

Покриті критичні сценарії: вхід/помилка авторизації, валідація форм, створення розділу та вкладеного розділу, створення канбан-колонки, переміщення картки між колонками (RPC), заборона вкладення розділу в самого себе/власного нащадка, а також коректна обробка помилок доступу (RLS) на рівні клієнтських запитів.
