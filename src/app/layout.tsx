
"use client";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/context/Providers";
import { themes, type Theme } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import type { CustomTheme, DashboardCardConfig } from "@/lib/types";
import { useContext, useMemo } from "react";
import { AppDataContext } from "@/context/AppDataContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { platformConfig } = useContext(AppDataContext);

  const appIconUrl = platformConfig?.appIconUrl || DEFAULT_APP_ICON_URL;

  const activeThemeColors = useMemo(() => {
    // 1. Prioritize customTheme if it exists. This is the source of truth.
    if (platformConfig?.customTheme && Object.keys(platformConfig.customTheme).length > 0) {
        return platformConfig.customTheme;
    }
    
    // 2. If no customTheme, find the theme by its name in the default list.
    const themeName = platformConfig?.theme || 'default';
    const selectedTheme = themes.find(t => t.name === themeName) || themes.find(t => t.name === 'default');

    // 3. All themes are dark by default in themes.ts
    return selectedTheme!.cssVars.dark;
  }, [platformConfig?.theme, platformConfig?.customTheme]);

  const dashboardCardsConfig = platformConfig?.dashboardCards;

  const cssVariables = useMemo(() => {
    if (!activeThemeColors) return '';
    return Object.entries(activeThemeColors)
      .map(([key, value]) => `--${key}: ${value};`)
      .join('\n');
  }, [activeThemeColors]);
    
  let cardSizeVariables = '';
  if (dashboardCardsConfig) {
    cardSizeVariables = `
      --card-title-size: ${dashboardCardsConfig.cardTitleSize || '0.875rem'};
      --card-value-size: ${dashboardCardsConfig.cardValueSize || '1.5rem'};
      --card-description-size: ${dashboardCardsConfig.cardDescriptionSize || '0.75rem'};
    `;
  }
    
  const themeStyle = `:root {\n${cssVariables}\n${cardSizeVariables}\n}`;

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
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      </head>
      <body className="font-body antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
