/**
 * Создаёт платёж через Tinkoff Init API и возвращает PaymentURL.
 *
 * Защита:
 *   - Origin/Referer (только наш домен)
 *   - Лимит размера тела (4 KB)
 *   - Honeypot-поле (если заполнено — бот)
 *   - Cloudflare Turnstile (если задан TURNSTILE_SECRET)
 *   - Жёсткая валидация длины и формата полей
 *   - Все ошибки — обобщённые сообщения (не палим внутренности)
 *
 * Env vars (Cloudflare Pages → Settings → Environment variables → Production):
 *   TINKOFF_TERMINAL_KEY   — ключ боевого терминала
 *   TINKOFF_PASSWORD       — пароль боевого терминала (секрет!)
 *   TINKOFF_TAXATION       — usn_income (по умолчанию)
 *   PRICE_KOPEKS           — 299000 (по умолчанию = 2990 ₽)
 *   PUBLIC_URL             — https://arabovsensey.ru
 *   ALLOWED_ORIGINS        — через запятую (по умолчанию = PUBLIC_URL)
 *   TURNSTILE_SECRET       — (опц.) секрет Cloudflare Turnstile
 */

interface Env {
  TINKOFF_TERMINAL_KEY: string;
  TINKOFF_PASSWORD: string;
  TINKOFF_TAXATION?: string;
  PRICE_KOPEKS?: string;
  PUBLIC_URL?: string;
  ALLOWED_ORIGINS?: string;
  TURNSTILE_SECRET?: string;
}

const MAX_BODY_BYTES = 4 * 1024;
const MAX_NAME = 60;
const MAX_EMAIL = 120;
const MAX_PHONE = 20;

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function tinkoffToken(body: Record<string, unknown>, password: string): Promise<string> {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v === null || typeof v === "object") continue;
    flat[k] = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
  }
  flat.Password = password;
  const concat = Object.keys(flat)
    .sort()
    .map((k) => flat[k])
    .join("");
  return sha256Hex(concat);
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("8")) return "+7" + digits.slice(1);
  if (digits.length === 11 && digits.startsWith("7")) return "+" + digits;
  if (digits.length === 10) return "+7" + digits;
  return "+" + digits;
}

function originAllowed(req: Request, env: Env): boolean {
  const allowed = (env.ALLOWED_ORIGINS ?? env.PUBLIC_URL ?? "https://arabovsensey.ru")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const check = (url: string | null) => {
    if (!url) return false;
    try {
      const u = new URL(url);
      return allowed.includes(`${u.protocol}//${u.host}`);
    } catch {
      return false;
    }
  };
  return check(origin) || check(referer);
}

async function turnstileOk(req: Request, env: Env, token: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true; // не настроен — пропускаем
  if (!token) return false;
  const ip = req.headers.get("cf-connecting-ip") ?? "";
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const data = (await r.json()) as { success?: boolean };
  return data.success === true;
}

const badRequest = (msg: string, status = 400) =>
  Response.json({ ok: false, error: msg }, { status });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!originAllowed(request, env)) {
    return badRequest("Forbidden", 403);
  }

  // Body size guard
  const cl = Number(request.headers.get("content-length") ?? "0");
  if (cl && cl > MAX_BODY_BYTES) return badRequest("Payload too large", 413);

  let payload: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string; // honeypot
    turnstileToken?: string;
  };
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return badRequest("Payload too large", 413);
    payload = JSON.parse(text);
  } catch {
    return badRequest("Bad request");
  }

  // Honeypot: реальные пользователи это поле не видят
  if (payload.company && payload.company.trim().length > 0) {
    return badRequest("Bad request");
  }

  // Turnstile (если включён)
  if (!(await turnstileOk(request, env, payload.turnstileToken ?? ""))) {
    return badRequest("Подтверди, что ты не робот", 403);
  }

  const name = (payload.name ?? "").trim().slice(0, MAX_NAME);
  const email = (payload.email ?? "").trim().toLowerCase().slice(0, MAX_EMAIL);
  const rawPhone = (payload.phone ?? "").trim().slice(0, MAX_PHONE);
  const phone = normalizePhone(rawPhone);

  if (!name || name.length < 2) return badRequest("Укажи имя");
  if (!EMAIL_RE.test(email)) return badRequest("Укажи корректный email");
  if (!phone || phone.length < 11) return badRequest("Укажи телефон");

  if (!env.TINKOFF_TERMINAL_KEY || !env.TINKOFF_PASSWORD) {
    console.error("Tinkoff env not configured");
    return badRequest("Сервис временно недоступен", 503);
  }

  const amount = Number(env.PRICE_KOPEKS ?? "299000");
  const orderId = `sensey-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const taxation = env.TINKOFF_TAXATION ?? "usn_income";
  const publicUrl = (env.PUBLIC_URL ?? "https://arabovsensey.ru").replace(/\/$/, "");

  const init: Record<string, unknown> = {
    TerminalKey: env.TINKOFF_TERMINAL_KEY,
    Amount: amount,
    OrderId: orderId,
    Description: "SENSEY — доступ к школе",
    SuccessURL: `${publicUrl}/?paid=1`,
    FailURL: `${publicUrl}/?paid=0`,
    NotificationURL: `${publicUrl}/api/tinkoff-webhook`,
    DATA: { Name: name, Email: email, Phone: phone },
    Receipt: {
      Email: email,
      Phone: phone,
      Taxation: taxation,
      Items: [
        {
          Name: "Доступ к школе SENSEY",
          Price: amount,
          Quantity: 1,
          Amount: amount,
          Tax: "none",
          PaymentMethod: "full_payment",
          PaymentObject: "service",
        },
      ],
    },
  };

  init.Token = await tinkoffToken(init, env.TINKOFF_PASSWORD);

  let data: { Success?: boolean; PaymentURL?: string; Message?: string };
  try {
    const r = await fetch("https://securepay.tinkoff.ru/v2/Init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(init),
    });
    data = (await r.json()) as typeof data;
  } catch (e) {
    console.error("Tinkoff Init network", e);
    return badRequest("Платёжный шлюз недоступен, попробуй позже", 502);
  }

  if (!data.Success || !data.PaymentURL) {
    console.error("Tinkoff Init failed", { orderId, msg: data.Message });
    return badRequest("Не удалось создать платёж", 502);
  }

  // Жёсткая проверка: ссылка оплаты обязана быть на доменах Тинькофф.
  // Защищает от подмены гейта даже если кто-то перепишет env var.
  const ALLOWED_PAY_HOSTS = new Set(["securepay.tinkoff.ru", "pay.tinkoff.ru", "pay.tbank.ru"]);
  try {
    const u = new URL(data.PaymentURL);
    if (u.protocol !== "https:" || !ALLOWED_PAY_HOSTS.has(u.host)) {
      console.error("Suspicious PaymentURL host", { orderId, host: u.host });
      return badRequest("Ошибка платёжного шлюза", 502);
    }
  } catch {
    return badRequest("Ошибка платёжного шлюза", 502);
  }

  return Response.json({ ok: true, url: data.PaymentURL });
};

// Закрываем все остальные методы.
export const onRequest: PagesFunction = async ({ request }) => {
  if (request.method === "POST") return new Response(null);
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
};
