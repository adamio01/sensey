import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SENSEY — Школа мужчины. Сила, удар, дисциплина",
  description:
    "Школа мужчины. Тренировки силы, ударов и дисциплины от наставника.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
