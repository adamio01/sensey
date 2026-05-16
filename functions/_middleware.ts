/**
 * Глобальный middleware для всех ответов Cloudflare Pages.
 * Добавляет security headers: CSP, HSTS, X-Frame-Options, Permissions-Policy и т.д.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(self), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  // CSP: разрешаем шрифты Google, Tinkoff iframe (для будущих 3-D Secure редиректов не нужен — мы редиректим, а не вставляем), Turnstile (challenges.cloudflare.com).
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://api.resend.com",
    "frame-src https://challenges.cloudflare.com",
    "form-action 'self' https://securepay.tinkoff.ru https://pay.tbank.ru",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; "),
};

export const onRequest: PagesFunction = async ({ next }) => {
  const res = await next();
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    headers.set(k, v);
  }
  // Глушим утечку версий
  headers.delete("server");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
};
