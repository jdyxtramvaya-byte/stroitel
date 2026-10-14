# Личные кабинеты — настройка backend

Текущий интерфейс GitHub Pages остаётся статическим. Этот каталог добавляет серверную основу на Supabase, но **сам по себе не включает вход в существующий React-интерфейс**. Подключение интерфейса выполняется после создания проекта Supabase и получения URL + publishable/anon key. Service role key никогда не добавлять в Vite-переменные или клиентский код.

## Что подготовлено

- `migrations/202610150001_secure_accounts.sql`: профили, проекты, приглашения, RLS и одноразовое атомарное погашение ключа.
- `functions/create-invite/index.ts`: ключи генерирует только владелец, проверенный по серверному `OWNER_USER_ID`.
- `functions/register-with-invite/index.ts`: регистрация с одноразовым ключом и паролем.
- Все проекты имеют `owner_id`; RLS ограничивает чтение/изменение собственными записями.

## Настройка Supabase

1. Создайте проект Supabase и сохраните Project URL, anon/publishable key и service_role key в безопасном месте.
2. Примените SQL из `migrations/202610150001_secure_accounts.sql` в SQL Editor.
3. Создайте первый аккаунт владельца через Supabase Auth (сильный уникальный пароль).
4. В SQL Editor выполните `update public.profiles set role = 'owner' where id = '<UUID пользователя владельца>';` — подставьте реальный UUID из Authentication → Users.
5. Установите Supabase CLI, выполните `supabase login`, `supabase link --project-ref <PROJECT_REF>`, затем разверните обе функции:
   `supabase functions deploy create-invite`
   `supabase functions deploy register-with-invite`
6. Установите secrets для функций:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OWNER_USER_ID` — UUID владельца
   - `APP_ORIGIN=https://jdyxtramvaya-byte.github.io`
7. Для production настройте rate limits/monitoring и проверьте RLS через два тестовых аккаунта.

## Важные замечания перед запуском

- Не размещайте service role key в `.env` с префиксом `VITE_`, репозитории, GitHub Pages или браузере.
- Сейчас invite создаётся в базе только в виде SHA-256-хеша; исходный ключ показывается владельцу один раз.
- Функция регистрации подтверждает email административно. Если хотите подтверждение email письмом, измените flow перед публичным запуском.
- Ключи ограничены сроком действия; владелец может отзывать их через серверную админ-операцию. UI для управления ключами ещё нужно подключить к существующему интерфейсу.
- Локальные проекты не мигрируют автоматически в облако. Сначала будет нужен безопасный импорт и подтверждение владельца.
- До завершения интеграции приложения и тестов не считать систему готовой для реальных пользовательских данных.
