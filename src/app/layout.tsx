
"use client";

import { useContext, useEffect, useMemo } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppDataProvider, AppDataContext } from "@/context/AppDataContext";
import { StudentDataProvider } from "@/context/StudentDataContext";
import { themes } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import type { CustomTheme } from "@/lib/types";

const DynamicHead = () => {
  const { platformConfig } = useContext(AppDataContext);
  const appIconUrl = platformConfig?.appIconUrl || DEFAULT_APP_ICON_URL;
  const themeName = useMemo(() => platformConfig?.theme || 'default', [platformConfig]);
  const customTheme = useMemo(() => platformConfig?.customTheme, [platformConfig]);

  const themeVars = useMemo(() => {
    let vars: CustomTheme;
    if (themeName === 'custom' && customTheme) {
      vars = customTheme;
    } else {
      const theme = themes.find(t => t.name === themeName) || themes.find(t => t.name === 'default')!;
      vars = theme.cssVars.dark;
    }
    const cssText = Object.entries(vars)
      .map(([key, value]) => `--${key}: ${value};`)
      .join('\n');
      
    return `:root {\n${cssText}\n}`;
  }, [themeName, customTheme]);

  return (
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
        <style dangerouslySetInnerHTML={{ __html: themeVars }} />
      </head>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <AppDataProvider>
        <DynamicHead />
        <body className="font-body antialiased">
            <StudentDataProvider>
                {children}
                <Toaster />
            </StudentDataProvider>
        </body>
      </AppDataProvider>
    </html>
  );
}
