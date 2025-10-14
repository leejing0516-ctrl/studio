
"use client";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/context/Providers";
import { themes, type Theme } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import type { CustomTheme, DashboardCardConfig } from "@/lib/types";
import { useContext, useEffect } from "react";
import { AppDataContext } from "@/context/AppDataContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { platformConfig } = useContext(AppDataContext);

  const appIconUrl = platformConfig?.appIconUrl || DEFAULT_APP_ICON_URL;
  
  // Correctly determine the active theme's CSS variables
  const activeTheme = (() => {
    // ALWAYS prioritize the explicitly saved customTheme object.
    if (platformConfig?.customTheme) {
      return platformConfig.customTheme;
    }
    
    // Fallback logic for initial load or if customTheme is somehow missing.
    const themeName = platformConfig?.theme || 'default';
    const selectedTheme = themes.find(t => t.name === themeName);
    if (selectedTheme) {
      // For themes with both light and dark, decide which one to use.
      // Here we can add logic, for now, defaulting to dark if light is not present.
      return selectedTheme.cssVars.light || selectedTheme.cssVars.dark;
    }

    // Absolute fallback to the hardcoded default theme.
    return themes.find(t => t.name === 'default')!.cssVars.dark;
  })();
  
  const dashboardCardsConfig = platformConfig?.dashboardCards;

  const cssVariables = activeTheme ? Object.entries(activeTheme)
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n') : '';
    
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
