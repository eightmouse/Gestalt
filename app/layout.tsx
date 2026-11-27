import type { Metadata } from "next";
import "./globals.css";
import "./desktop-navigation.css";
import "./memory-state.css";
import "./appearance.css";
import "./pocket-index.css";

export const metadata: Metadata = {
  title: "Gestalt Archive",
  description: "A personal operating-system style archive for projects, games, setup notes, and field logs.",
  icons: {
    icon: "/favicon.ico?v=1.88.1"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="/appearance.js" data-backdrop-night="/images/archive-backdrop.webp" data-backdrop-day="/images/archive-backdrop-day.webp" />
        <script src="/os-behaviour.js" />
        <link rel="preload" as="image" href="/images/eightmouse-avatar.png" media="(min-width: 761px)" />
      </head>
      <body>{children}</body>
    </html>
  );
}
