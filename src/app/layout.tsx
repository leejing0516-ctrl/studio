"use client";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { themes, type Theme } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import type { CustomTheme, DashboardCardConfig } from "@/lib/types";
import { useContext, useMemo } from "react";
// We will get platformConfig from a lighter context if needed, or handle it differently.
// For now, let's assume we get it from a simpler context or a direct fetch for the layout.
// To resolve the immediate issue, we are removing the dependency on AppDataContext here.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  // For the purpose of this fix, we are temporarily removing the dynamic theme loading
  // to break the dependency chain causing the infinite loop. A more robust solution
  // would involve a separate, lightweight context for theme and platform config.
  const appIconUrl = DEFAULT_APP_ICON_URL;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>南梓實小虛擬銀行</title>
        <meta name="description" content="一個為學生設計，充滿活力的獎勵與金融素養應用程式。" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href={appIconUrl} />
        <meta name="theme-color" content="#000000" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
          rel="stylesheet"
        />
        {/* A default theme will be applied via globals.css */}
      </head>
      <body className="font-body antialiased">
          {children}
          <Toaster />
      </body>
    </html>
  );
}
