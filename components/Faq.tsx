"use client";
import { useState } from "react";

type QA = { q: string; a: string };

const items: QA[] = [
  {
    q: "Я никогда не тренировался — мне подойдёт?",
    a: "Да. Программа построена от базы: техника удара, дисциплина, дыхание. Усложняется по мере роста.",
  },
  {
    q: "Сколько времени нужно в день?",
    a: "От 40 минут. Тренировка построена так, чтобы её можно было сделать дома без зала.",
  },
  {
    q: "Что если не понравится?",
    a: "Возврат денег в течение 7 дней без вопросов, если посчитаешь, что это не твоё.",
  },
  {
    q: "Это онлайн или офлайн?",
    a: "Онлайн. Доступ к материалам — навсегда. Смотри в удобное время с любого устройства.",
  },
  {
    q: "Как происходит оплата?",
    a: "Безопасная оплата картой через Тинькофф. После оплаты сразу открывается доступ.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="faq-list">
      {items.map((it, i) => (
        <div key={i} className={`faq-item${open === i ? " open" : ""}`}>
          <button
            className="faq-q"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            {it.q}
          </button>
          <div className="faq-a">{it.a}</div>
        </div>
      ))}
    </div>
  );
}
