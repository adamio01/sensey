# Безопасность SENSEY

## Что защищено в коде

### Платёж не может уйти не туда
- `TerminalKey` и `Password` Tinkoff лежат **только** в Cloudflare Pages env vars (Production secret). В репо их нет.
- `Amount` берётся из env var `PRICE_KOPEKS`, **не из клиентского запроса** — фронт не может прислать «оплачу 1 рубль вместо 2990».
- `OrderId` генерится на сервере (timestamp + uuid).
- Подпись запроса в Tinkoff (`Token`) считается на сервере с паролем терминала — без `Password` валидный запрос составить нельзя.

### Нотификация об оплате не подделывается
- Webhook `/api/tinkoff-webhook` проверяет SHA-256 подпись Tinkoff. Любой запрос без правильного `Token` → 401.
- Tinkoff подписывает нотификации тем же `Password`, что хранится только у нас.

### Защита формы от ботов
- Honeypot-поле `company` — невидимое для людей, бот его заполнит и получит отказ.
- Проверка `Origin`/`Referer` — запросы только с `arabovsensey.ru`.
- Лимит размера тела (4 KB), лимиты длины полей, регексп для email.
- (Опционально) Cloudflare Turnstile — если задать `TURNSTILE_SECRET`.

### Security headers
В `functions/_middleware.ts`:
- `Strict-Transport-Security` (форс HTTPS на 2 года)
- `Content-Security-Policy` (разрешён только наш домен + нужные внешние)
- `X-Frame-Options: DENY` (защита от clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (выключены камера/гео/микрофон)

## Можно ли «перенаправить оплаты на чужой Тинькофф»?

Только через **взлом твоего аккаунта**. Сам код этого не позволяет:

- `TerminalKey` (куда деньги) лежит в Cloudflare Pages env vars, не в коде.
- Фронтенд эту сумму и адрес **не задаёт** — только сервер.
- CSP-заголовок `form-action` разрешает редирект на оплату только на `securepay.tinkoff.ru` и `pay.tbank.ru` — браузер физически не даст уйти на левый домен.
- Сервер дополнительно валидирует, что `PaymentURL` от Тинькофф приходит с разрешённого хоста.
- Webhook принимает только запросы, подписанные нашим `TINKOFF_PASSWORD`.

Чтобы перенаправить деньги, злодею нужен один из:
1. Доступ к **твоему Cloudflare** (чтобы поменять `TINKOFF_TERMINAL_KEY`).
2. Доступ к **GitHub-аккаунту** + право пуша в `main` (чтобы залить malicious commit).
3. Доступ к **reg.ru** (чтобы переключить NS и поднять свой сайт-клон на твоём домене).
4. Доступ в **Tinkoff Бизнес** (чтобы поменять реквизиты получателя).

→ Поэтому **2FA на этих 4 аккаунтах — главная защита**. Сильнее любого кода.

## Что нужно сделать тебе вручную

### 1. Включи 2FA везде (самое важное)
Самая частая дыра — не дыра в коде, а кража аккаунта.
- **reg.ru** → Личный кабинет → Безопасность → 2FA. Если уведут аккаунт — поменяют NS и заберут трафик.
- **Cloudflare** → My Profile → Authentication → Two-Factor.
- **GitHub** → Settings → Password and authentication → 2FA.
- **Tinkoff Бизнес** → 2FA + ограничение IP, если есть.

### 2. Env vars в Cloudflare Pages
В дашборде проекта Pages → Settings → Environment variables → **Production**:

| Имя | Значение | Тип |
|---|---|---|
| `TINKOFF_TERMINAL_KEY` | из кабинета Tinkoff Бизнес | **Secret** (Encrypted) |
| `TINKOFF_PASSWORD` | пароль терминала | **Secret** |
| `RESEND_API_KEY` | из resend.com | **Secret** |
| `FROM_EMAIL` | `SENSEY <noreply@arabovsensey.ru>` | Plain |
| `COURSE_ACCESS_URL` | ссылка на материалы (Google Drive / Notion) | Plain |
| `PUBLIC_URL` | `https://arabovsensey.ru` | Plain |
| `PRICE_KOPEKS` | `299000` | Plain |
| `OWNER_EMAIL` | твой email | Plain |
| `TURNSTILE_SECRET` | (опц.) ключ Turnstile | **Secret** |

Все `Secret` помечай типом **Encrypted** — после сохранения их нельзя прочитать обратно.

### 3. В Tinkoff Бизнес
- В настройках терминала пропиши **Notification URL**: `https://arabovsensey.ru/api/tinkoff-webhook`
- Включи **HTTPS only** для NotificationURL.
- При смене пароля терминала — сразу обнови `TINKOFF_PASSWORD` в Cloudflare.

### 4. Никогда не коммить секреты
- `.env*.local` уже в `.gitignore`.
- Если случайно закоммитил секрет — **сразу отзови его в кабинете Tinkoff/Resend** (просто удалить из git недостаточно — он остаётся в истории).

### 5. Мониторинг
- Cloudflare → Analytics → Security: смотри попытки атак.
- Resend → Logs: какие письма уходят.
- Tinkoff → отчёт по платежам сверяй раз в неделю.

## Чек-лист перед запуском

- [ ] 2FA на reg.ru / Cloudflare / GitHub / Tinkoff Бизнес
- [ ] Все env vars прописаны в Cloudflare Pages → Production
- [ ] NotificationURL прописан в Tinkoff
- [ ] Resend домен `arabovsensey.ru` верифицирован (SPF + DKIM записи добавлены в Cloudflare DNS)
- [ ] Сделал тестовый платёж на 1 ₽ (через тестовый терминал Tinkoff) — пришло письмо
- [ ] Сделал боевой платёж — пришло письмо, деньги дошли
