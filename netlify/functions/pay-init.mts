/**
 * POST /api/pay-init  → создаёт платёж через Tinkoff и возвращает PaymentURL.
 *
 * Netlify env vars (Site settings → Environment variables):
 *   TINKOFF_TERMINAL_KEY, TINKOFF_PASSWORD, TINKOFF_TAXATION, PRICE_KOPEKS,
 *   PUBLIC_URL, ALLOWED_ORIGINS, TURNSTILE_SECRET (опц.)
 */
import type { Context } from "@netlify/functions";

const MAX_BODY_BYTES = 4 * 1024;
const MAX_NAME = 60;
const MAX_EMAIL = 120;
const MAX_PHONE = 20;
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const ALLOWED_PAY_HOSTS = new Set(["securepay.tinkoff.ru", "pay.tinkoff.ru", "pay.tbank.ru"]);

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function tinkoffToken(body: Record<string, unknown>, password: string): Promise<string> {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v === null || typeof v === "object") continue;
    flat[k] = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
  }
  flat.Password = password;
  const concat = Object.keys(flat).sort().map((k) => flat[k]).join("");
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

function originAllowed(req: Request): boolean {
  const env = process.env;
  const allowed = (env.ALLOWED_ORIGINS ?? env.PUBLIC_URL ?? "https://arabovsensey.ru")
    .split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const check = (url: string | null) => {
    if (!url) return false;
    try {
      const u = new URL(url);
      return allowed.includes(`${u.protocol}//${u.host}`);
    } catch { return false; }
  };
  return check(origin) || check(referer);
}

async function turnstileOk(req: Request, token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;
  if (!token) return false;
  const ip = req.headers.get("x-nf-client-connection-ip") ?? "";
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", body: form,
  });
  const data = await r.json() as { success?: boolean };
  return data.success === true;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export default async (req: Request, _ctx: Context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }
  if (!originAllowed(req)) return json({ ok: false, error: "Forbidden" }, 403);

  const cl = Number(req.headers.get("content-length") ?? "0");
  if (cl && cl > MAX_BODY_BYTES) return json({ ok: false, error: "Payload too large" }, 413);

  let payload: { name?: string; email?: string; phone?: string; company?: string; turnstileToken?: string };
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return json({ ok: false, error: "Payload too large" }, 413);
    payload = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "Bad request" }, 400);
  }

  if (payload.company && payload.company.trim()) return json({ ok: false, error: "Bad request" }, 400);
  if (!(await turnstileOk(req, payload.turnstileToken ?? ""))) {
    return json({ ok: false, error: "Подтверди, что ты не робот" }, 403);
  }

  const name = (payload.name ?? "").trim().slice(0, MAX_NAME);
  const email = (payload.email ?? "").trim().toLowerCase().slice(0, MAX_EMAIL);
  const phone = normalizePhone((payload.phone ?? "").trim().slice(0, MAX_PHONE));

  if (!name || name.length < 2) return json({ ok: false, error: "Укажи имя" }, 400);
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: "Укажи корректный email" }, 400);
  if (!phone || phone.length < 11) return json({ ok: false, error: "Укажи телефон" }, 400);

  const env = process.env;
  if (!env.TINKOFF_TERMINAL_KEY || !env.TINKOFF_PASSWORD) {
    console.error("Tinkoff env not configured");
    return json({ ok: false, error: "Сервис временно недоступен" }, 503);
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
      Email: email, Phone: phone, Taxation: taxation,
      Items: [{
        Name: "Доступ к школе SENSEY",
        Price: amount, Quantity: 1, Amount: amount,
        Tax: "none", PaymentMethod: "full_payment", PaymentObject: "service",
      }],
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
    data = await r.json() as typeof data;
  } catch (e) {
    console.error("Tinkoff Init network", e);
    return json({ ok: false, error: "Платёжный шлюз недоступен" }, 502);
  }
  if (!data.Success || !data.PaymentURL) {
    console.error("Tinkoff Init failed", { orderId, msg: data.Message });
    return json({ ok: false, error: "Не удалось создать платёж" }, 502);
  }

  try {
    const u = new URL(data.PaymentURL);
    if (u.protocol !== "https:" || !ALLOWED_PAY_HOSTS.has(u.host)) {
      console.error("Suspicious PaymentURL host", { orderId, host: u.host });
      return json({ ok: false, error: "Ошибка платёжного шлюза" }, 502);
    }
  } catch {
    return json({ ok: false, error: "Ошибка платёжного шлюза" }, 502);
  }

  return json({ ok: true, url: data.PaymentURL });
};

export const config = { path: "/api/pay-init" };
