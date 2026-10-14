# Личные кабинеты — настройка backend

Текущий интерфейс GitHub Pages остаётся статическим. Этот каталог добавляет серверную основу на Supabase, но сам по себе не включает вход в существующий React-интерфейс. Подключение интерфейса выполняется после создания проекта Supabase и получения URL + anon/publishable key. Service role key никогда не добавлять в клиентский код.

## Подготовлено

- `migrations/202610150001_secure_accounts.sql`: профили, проекты, приглашения, RLS и атомарное погашение одноразового ключа.
- `functions/create-invite/index.ts`: выпуск ключа только владельцем.
- `functions/register-with-invite/index.ts`: регистрация с одноразовым ключом и паролем.
- `functions/manage-invites/index.ts`: список ключей и отзыв неиспользованных приглашений.
- Все проекты имеют `owner_id`; RLS ограничивает доступ собственными записями.

## Настройка

1. Создайте проект Supabase и сохраните Project URL, anon key и service_role key в безопасном месте.
2. Примените SQL из `migrations/202610150001_secure_accounts.sql` в SQL Editor.
3. Создайте первый аккаунт владельца через Supabase Auth.
4. В SQL Editor выполните `update public.profiles set role = 'owner' where id = '<UUID владельца>';`.
5. Установите Supabase CLI и выполните `supabase login`, `supabase link --project-ref <PROJECT_REF>`.
6. Разверните функции:
   - `supabase functions deploy create-invite`
   - `supabase functions deploy manage-invites`
   - `supabase functions deploy register-with-invite --no-verify-jwt`
7. Задайте secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OWNER_USER_ID` (UUID владельца), `APP_ORIGIN=https://jdyxtramvaya-byte.github.io`.
8. Проверьте RLS двумя тестовыми пользователями и попытайтесь прочитать чужой проект.

## Перед production

- Не добавляйте service role key в `VITE_*`, репозиторий или браузер.
- В базе хранится только SHA-256-хеш ключа; сам ключ возвращается владельцу один раз.
- Регистрация подтверждает email административно. При необходимости добавьте подтверждение email письмом.
- Локальные проекты автоматически не мигрируют в облако.
- До подключения интерфейса и проверки сценариев система не готова для реальных пользовательских данных.
