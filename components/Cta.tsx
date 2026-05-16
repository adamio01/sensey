"use client";
import { useState, useCallback } from "react";
import PayModal from "./PayModal";

type Variant = "nav" | "hero" | "price" | "final";

export default function Cta({
  variant,
  children,
}: {
  variant: Variant;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const onOpen = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(true);
  }, []);

  const button = (() => {
    if (variant === "nav") {
      return (
        <a href="#" className="nav-cta" onClick={onOpen}>
          Забрать
        </a>
      );
    }
    if (variant === "price") {
      return (
        <a href="#" className="price-cta" onClick={onOpen}>
          Забрать доступ
        </a>
      );
    }
    return (
      <a href="#" className="hero-cta" onClick={onOpen}>
        {children ?? "Вступить"}
        <span className="hero-cta-arrow">→</span>
      </a>
    );
  })();

  return (
    <>
      {button}
      <PayModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
