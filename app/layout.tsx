import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestalt Archive",
  description: "A personal operating-system style archive for projects, games, setup notes, and field logs.",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="image" href="/images/archive-banner.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
