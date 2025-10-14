
"use client";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/context/Providers";
import { themes } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import type { CustomTheme } from "@/lib/types";
import { useContext, useEffect } from "react";
import { AppDataContext } from "@/context/AppDataContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { platformConfig } = useContext(AppDataContext);

  const appIconUrl = platformConfig?.appIconUrl || DEFAULT_APP_ICON_URL;
  const themeName = platformConfig?.theme || 'default';
  const customTheme = platformConfig?.customTheme;

  let activeTheme: CustomTheme;
  if (themeName === 'custom' && customTheme) {
    activeTheme = customTheme;
  } else {
    activeTheme = themes.find(t => t.name === themeName)?.cssVars.dark 
      || themes.find(t => t.name === 'default')!.cssVars.dark;
  }
  
  const cssVariables = activeTheme 
    ? Object.entries(activeTheme)
        .map(([key, value]) => `--${key}: ${value};`)
        .join('\n') 
    : '';
    
  const themeStyle = `:root {\n${cssVariables}\n}`;

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
        {/* Directly render the style tag in the head */}
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
