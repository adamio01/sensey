"use client";
import { useEffect, useState } from "react";

type Status = "idle" | "loading" | "error";

export default function PayModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErr("");
    try {
      const r = await fetch("/api/pay-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, company }),
      });
      const data = (await r.json()) as { ok: boolean; url?: string; error?: string };
      if (!data.ok || !data.url) throw new Error(data.error ?? "Ошибка платежа");
      window.location.href = data.url;
    } catch (e) {
      setStatus("error");
      setErr(e instanceof Error ? e.message : "Ошибка");
    }
  };

  return (
    <div className="paymodal-overlay" onClick={onClose}>
      <div className="paymodal" onClick={(e) => e.stopPropagation()}>
        <button className="paymodal-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <div className="paymodal-eyebrow">// оплата</div>
        <h3 className="paymodal-title">
          Вход в <span className="accent">SENSEY</span>
        </h3>
        <p className="paymodal-sub">2 990 ₽ — доступ навсегда. Получишь письмо со ссылкой на материалы сразу после оплаты.</p>
        <form onSubmit={submit} className="paymodal-form">
          <input
            className="paymodal-input"
            placeholder="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <input
            className="paymodal-input"
            type="email"
            placeholder="Email (на него придёт доступ)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="paymodal-input"
            type="tel"
            placeholder="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          {/* Honeypot: невидим для людей, бот заполнит — сервер отбросит */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            aria-hidden="true"
          />
          {err && <div className="paymodal-error">{err}</div>}
          <button type="submit" className="paymodal-submit" disabled={status === "loading"}>
            {status === "loading" ? "Перевод на оплату..." : "Перейти к оплате →"}
          </button>
        </form>
      </div>
    </div>
  );
}
