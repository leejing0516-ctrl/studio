
"use client";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { themes, type Theme } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import type { CustomTheme } from "@/lib/types";
import { useMemo, useContext } from "react";
import { Providers } from "@/context/Providers";
import { AppDataContext } from "@/context/AppDataContext";


function StyleInjector() {
  const { platformConfig } = useContext(AppDataContext);

  const themeName = platformConfig?.theme || 'makeup-pink';
  const appIconUrl = platformConfig?.appIconUrl || DEFAULT_APP_ICON_URL;

  const activeTheme = useMemo(() => {
    const availableThemes = [...themes, ...(platformConfig?.customThemes || [])];
    return availableThemes.find(t => t.name === themeName) || themes.find(t => t.name === 'makeup-pink');
  }, [themeName, platformConfig?.customThemes]);

  const themeCss = useMemo(() => {
    if (!activeTheme) return "";
    
    const vars = activeTheme.cssVars.light || activeTheme.cssVars.dark;
    
    let css = ":root {\n";
    for (const [key, value] of Object.entries(vars)) {
      css += `  --${key}: ${value};\n`;
    }
    css += "}\n";

    if (activeTheme.cssVars.dark) {
      css += ".dark {\n";
       for (const [key, value] of Object.entries(activeTheme.cssVars.dark)) {
         css += `  --${key}: ${value};\n`;
       }
       css += "}\n";
    }

    return css;
  }, [activeTheme]);

  return (
    <>
      <style>{themeCss}</style>
      <link rel="apple-touch-icon" href={appIconUrl} />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>南梓實小虛擬銀行</title>
        <meta name="description" content="一個為學生設計，充滿活力的獎勵與金融素養應用程式。" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
          <Providers>
            <StyleInjector />
            {children}
          </Providers>
          <Toaster />
      </body>
    </html>
  );
}
