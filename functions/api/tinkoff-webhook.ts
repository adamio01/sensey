/**
 * Tinkoff (T-Bank) payment notification webhook.
 *
 * URL для кабинета Tinkoff: https://arabovsensey.ru/api/tinkoff-webhook
 *
 * Env vars (Cloudflare Pages → Settings → Environment variables):
 *   TINKOFF_PASSWORD   — пароль терминала (Production)
 *   RESEND_API_KEY     — ключ Resend (https://resend.com/api-keys)
 *   FROM_EMAIL         — отправитель, например: SENSEY <noreply@arabovsensey.ru>
 *   COURSE_ACCESS_URL  — ссылка/инструкция, которую отправляем клиенту
 *   OWNER_EMAIL        — (опц.) твой email для дубля уведомления
 */

interface Env {
  TINKOFF_PASSWORD: string;
  RESEND_API_KEY: string;
  FROM_EMAIL: string;
  COURSE_ACCESS_URL: string;
  OWNER_EMAIL?: string;
}

type Notif = Record<string, unknown>;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Tinkoff token rules:
 *   1. Берём все скалярные поля нотификации (без Token, без вложенных объектов/массивов вроде Receipt и DATA).
 *   2. Добавляем поле Password со значением пароля терминала.
 *   3. Сортируем ключи по алфавиту.
 *   4. Конкатенируем значения в одну строку.
 *   5. SHA-256.
 */
async function expectedToken(notif: Notif, password: string): Promise<string> {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(notif)) {
    if (k === "Token") continue;
    if (v === null || typeof v === "object") continue; // skip Receipt, DATA
    flat[k] = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
  }
  flat.Password = password;
  const concat = Object.keys(flat)
    .sort()
    .map((k) => flat[k])
    .join("");
  return sha256Hex(concat);
}

function extractEmail(notif: Notif): string | null {
  const direct = notif.Email ?? notif.email;
  if (typeof direct === "string" && direct.includes("@")) return direct;

  const data = notif.DATA;
  if (data && typeof data === "object") {
    const email = (data as Record<string, unknown>).Email ?? (data as Record<string, unknown>).email;
    if (typeof email === "string" && email.includes("@")) return email;
  }

  const receipt = notif.Receipt;
  if (receipt && typeof receipt === "object") {
    const email = (receipt as Record<string, unknown>).Email;
    if (typeof email === "string" && email.includes("@")) return email;
  }
  return null;
}

async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<Response> {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.FROM_EMAIL, to, subject, html }),
  });
}

function clientHtml(env: Env, amountRub: number): string {
  return `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:560px;margin:0 auto">
      <h2 style="font-size:22px;letter-spacing:1px;text-transform:uppercase">SENSEY — Добро пожаловать в школу</h2>
      <p>Оплата прошла успешно. Сумма: <b>${amountRub.toLocaleString("ru-RU")} ₽</b>.</p>
      <p>Доступ к материалам школы открыт по ссылке ниже:</p>
      <p style="margin:24px 0">
        <a href="${env.COURSE_ACCESS_URL}" style="background:#c5ff00;color:#000;padding:14px 24px;border-radius:100px;text-decoration:none;font-weight:bold;letter-spacing:1px;text-transform:uppercase">Войти в школу</a>
      </p>
      <p>Если ссылка не открывается — скопируй её в браузер:<br><a href="${env.COURSE_ACCESS_URL}">${env.COURSE_ACCESS_URL}</a></p>
      <p style="margin-top:32px;color:#666;font-size:13px">Сила. Удар. Дисциплина.<br>SENSEY</p>
    </div>
  `;
}

function ownerHtml(notif: Notif, email: string | null): string {
  const rows = Object.entries(notif)
    .filter(([k]) => k !== "Token")
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td>${typeof v === "object" ? JSON.stringify(v) : String(v)}</td></tr>`)
    .join("");
  return `
    <div style="font-family:Arial,sans-serif;color:#111">
      <h3>Новая оплата — SENSEY</h3>
      <p>Email клиента: <b>${email ?? "не передан"}</b></p>
      <table style="border-collapse:collapse">${rows}</table>
    </div>
  `;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let notif: Notif;
  try {
    const ct = request.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      notif = (await request.json()) as Notif;
    } else {
      const form = await request.formData();
      notif = Object.fromEntries(form.entries());
    }
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // 1. Verify signature
  const got = String(notif.Token ?? "").toLowerCase();
  const want = (await expectedToken(notif, env.TINKOFF_PASSWORD)).toLowerCase();
  if (!got || got !== want) {
    console.error("Tinkoff webhook: bad token", { got, want });
    return new Response("Bad token", { status: 401 });
  }

  // Tinkoff требует ответ "OK" даже на не-CONFIRMED статусы, иначе будет ретраить.
  const status = String(notif.Status ?? "");
  const success = notif.Success === true || notif.Success === "true";
  if (status !== "CONFIRMED" || !success) {
    return new Response("OK");
  }

  // 2. Send emails
  const amount = Number(notif.Amount ?? 0) / 100; // приходит в копейках
  const clientEmail = extractEmail(notif);

  try {
    if (clientEmail) {
      const r = await sendEmail(env, clientEmail, "SENSEY — доступ к школе", clientHtml(env, amount));
      if (!r.ok) console.error("Resend client error:", await r.text());
    } else {
      console.warn("Tinkoff webhook: client email not provided");
    }

    if (env.OWNER_EMAIL) {
      await sendEmail(env, env.OWNER_EMAIL, `SENSEY: оплата ${amount} ₽${clientEmail ? ` — ${clientEmail}` : ""}`, ownerHtml(notif, clientEmail));
    }
  } catch (e) {
    console.error("Email send failed:", e);
  }

  return new Response("OK");
};

export const onRequestGet: PagesFunction = async () =>
  new Response("Tinkoff webhook is alive. POST only.", { status: 200 });
