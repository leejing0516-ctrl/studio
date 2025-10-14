
"use client";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { themes, type Theme } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import type { CustomTheme, DashboardCardConfig } from "@/lib/types";
import { useContext, useMemo } from "react";
import { AppDataContext, AppDataProvider } from "@/context/AppDataContext";
import { StudentDataProvider } from "@/context/StudentDataContext";
import { Providers } from "@/context/Providers";

// This component is necessary to access context within the layout
function StyleInjector() {
  const { platformConfig } = useContext(AppDataContext);

  const activeTheme = useMemo(() => {
    const selectedThemeName = platformConfig?.theme || 'makeup-pink';
    return themes.find(t => t.name === selectedThemeName) || themes.find(t => t.name === 'makeup-pink');
  }, [platformConfig?.theme]);

  const themeCss = useMemo(() => {
    if (!activeTheme) return "";
    
    // Use light theme vars as the base
    const vars = activeTheme.cssVars.light || activeTheme.cssVars.dark;
    
    let css = ":root {\n";
    for (const [key, value] of Object.entries(vars)) {
      css += `  --${key}: ${value};\n`;
    }
    css += "}\n";

    // If a dark theme exists, apply it
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
      <link rel="apple-touch-icon" href={platformConfig?.appIconUrl || DEFAULT_APP_ICON_URL} />
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
            <Toaster />
          </Providers>
      </body>
    </html>
  );
}
