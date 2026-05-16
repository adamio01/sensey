# SENSEY — Школа мужчины

Лендинг школы мужчины (сила, удар, дисциплина). Next.js 14 + TypeScript.

## Запуск

```bash
npm install
npm run dev
```

Открыть http://localhost:3000.

## Сборка

```bash
npm run build
npm start
```

## Структура

- `app/` — App Router (layout, page, globals.css)
- `components/Faq.tsx` — клиентский компонент FAQ-аккордеона
- `public/trainer.jpg` — фото тренера (замени на своё)

## Оплата

CTA-кнопки ведут на `https://pay.tbank.ru/cdnOrQCl`. Меняй константу `PAY_URL` в [app/page.tsx](app/page.tsx).
