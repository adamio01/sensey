/**
 * POST /api/tinkoff-webhook — нотификация Tinkoff об оплате.
 * После проверки подписи отправляем письмо клиенту через Resend.
 *
 * Env vars: TINKOFF_PASSWORD, RESEND_API_KEY, FROM_EMAIL, COURSE_ACCESS_URL, OWNER_EMAIL?
 */
import type { Context } from "@netlify/functions";

type Notif = Record<string, unknown>;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function expectedToken(notif: Notif, password: string): Promise<string> {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(notif)) {
    if (k === "Token") continue;
    if (v === null || typeof v === "object") continue;
    flat[k] = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
  }
  flat.Password = password;
  return sha256Hex(Object.keys(flat).sort().map((k) => flat[k]).join(""));
}

function extractEmail(notif: Notif): string | null {
  const direct = (notif.Email ?? notif.email) as unknown;
  if (typeof direct === "string" && direct.includes("@")) return direct;
  const data = notif.DATA as Record<string, unknown> | undefined;
  if (data) {
    const e = data.Email ?? data.email;
    if (typeof e === "string" && e.includes("@")) return e;
  }
  const receipt = notif.Receipt as Record<string, unknown> | undefined;
  if (receipt) {
    const e = receipt.Email;
    if (typeof e === "string" && e.includes("@")) return e;
  }
  return null;
}

async function sendEmail(to: string, subject: string, html: string): Promise<Response> {
  const env = process.env;
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.FROM_EMAIL, to, subject, html }),
  });
}

function clientHtml(amountRub: number): string {
  const tgUrl = process.env.COURSE_ACCESS_URL ?? "#";
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>SENSEY</title></head>
<body style="margin:0;padding:40px 20px;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#f5f5f5">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto">
    <tr><td style="padding:32px 28px;background:#141414;border-radius:16px;border:1px solid #262626">

      <div style="font-size:11px;letter-spacing:3px;color:#c5ff00;font-weight:700;text-transform:uppercase;margin-bottom:8px">// школа мужчины</div>
      <h1 style="font-size:32px;letter-spacing:1px;text-transform:uppercase;margin:0 0 24px;line-height:1;font-weight:900">Добро пожаловать,<br>в <span style="color:#c5ff00">SENSEY</span></h1>

      <p style="font-size:16px;line-height:1.6;color:#d4d4d4;margin:0 0 16px">
        Оплата прошла. Ты в школе.
      </p>

      <p style="font-size:15px;line-height:1.6;color:#a0a0a0;margin:0 0 28px">
        Сумма: <b style="color:#f5f5f5">${amountRub.toLocaleString("ru-RU")} ₽</b><br>
        Доступ — навсегда.
      </p>

      <div style="background:#0a0a0a;border:1px solid #262626;border-radius:12px;padding:24px;margin:0 0 28px">
        <div style="font-size:11px;letter-spacing:2px;color:#666;text-transform:uppercase;margin-bottom:12px;font-weight:600">// шаг 1 из 1</div>
        <h3 style="font-size:18px;margin:0 0 12px;color:#f5f5f5;text-transform:uppercase;letter-spacing:0.5px">Вступай в закрытый канал</h3>
        <p style="font-size:14px;line-height:1.6;color:#a0a0a0;margin:0 0 20px">
          Все материалы, тренировки, кодекс и связь со мной — в Telegram-канале школы. Жми ниже:
        </p>
        <a href="${tgUrl}" style="display:inline-block;background:#c5ff00;color:#000;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:2px;text-transform:uppercase">Войти в канал →</a>
        <p style="font-size:12px;color:#666;margin:16px 0 0;line-height:1.5">
          Если кнопка не открывается — скопируй ссылку:<br>
          <a href="${tgUrl}" style="color:#c5ff00;word-break:break-all">${tgUrl}</a>
        </p>
      </div>

      <p style="font-size:14px;line-height:1.6;color:#a0a0a0;margin:0 0 16px">
        Начни с первого видео — это твой первый день. Дальше — каждый день по уроку.
      </p>

      <p style="font-size:14px;line-height:1.6;color:#a0a0a0;margin:0 0 28px">
        Если возник вопрос — пиши прямо в канал.
      </p>

      <hr style="border:none;border-top:1px solid #262626;margin:28px 0">

      <p style="font-size:12px;color:#666;letter-spacing:2px;text-transform:uppercase;margin:0;font-weight:600">
        Сила · Удар · Дисциплина
      </p>
      <p style="font-size:11px;color:#444;margin:8px 0 0">
        SENSEY — школа мужчины · arabovsensey.ru
      </p>

    </td></tr>
  </table>
</body></html>`;
}

function ownerHtml(notif: Notif, email: string | null): string {
  const rows = Object.entries(notif)
    .filter(([k]) => k !== "Token")
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td>${typeof v === "object" ? JSON.stringify(v) : String(v)}</td></tr>`)
    .join("");
  return `<div style="font-family:Arial,sans-serif;color:#111"><h3>Новая оплата — SENSEY</h3><p>Email клиента: <b>${email ?? "не передан"}</b></p><table style="border-collapse:collapse">${rows}</table></div>`;
}

export default async (req: Request, _ctx: Context) => {
  if (req.method === "GET") return new Response("Tinkoff webhook is alive. POST only.", { status: 200 });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let notif: Notif;
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      notif = await req.json() as Notif;
    } else {
      const form = await req.formData();
      notif = Object.fromEntries(form.entries());
    }
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const env = process.env;
  const got = String(notif.Token ?? "").toLowerCase();
  const want = (await expectedToken(notif, env.TINKOFF_PASSWORD ?? "")).toLowerCase();
  if (!got || got !== want) {
    console.error("Tinkoff webhook: bad token");
    return new Response("Bad token", { status: 401 });
  }

  const status = String(notif.Status ?? "");
  const success = notif.Success === true || notif.Success === "true";
  if (status !== "CONFIRMED" || !success) return new Response("OK");

  const amount = Number(notif.Amount ?? 0) / 100;
  const clientEmail = extractEmail(notif);

  try {
    if (clientEmail) {
      const r = await sendEmail(clientEmail, "SENSEY — доступ к школе", clientHtml(amount));
      if (!r.ok) console.error("Resend client error:", await r.text());
    } else {
      console.warn("Client email not provided");
    }
    if (env.OWNER_EMAIL) {
      await sendEmail(env.OWNER_EMAIL, `SENSEY: оплата ${amount} ₽${clientEmail ? ` — ${clientEmail}` : ""}`, ownerHtml(notif, clientEmail));
    }
  } catch (e) {
    console.error("Email send failed:", e);
  }

  return new Response("OK");
};

export const config = { path: "/api/tinkoff-webhook" };
