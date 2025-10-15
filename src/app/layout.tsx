
"use client";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppDataProvider } from "@/context/AppDataContext";
import { StudentDataProvider } from "@/context/StudentDataContext";
import { AuthProvider } from "@/context/AuthContext";
import { themes, type Theme } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import type { CustomTheme } from "@/lib/types";
import { useContext, useMemo } from "react";
import { AppDataContext } from "@/context/AppDataContext";

function StyleInjector() {
  const { platformConfig } = useContext(AppDataContext);

  const themeName = platformConfig?.theme || 'default';
  const appIconUrl = platformConfig?.appIconUrl || DEFAULT_APP_ICON_URL;

  const availableThemes = useMemo(() => {
    return [...themes, ...(platformConfig?.customThemes || [])];
  }, [platformConfig?.customThemes]);

  const activeTheme = useMemo(() => {
    return availableThemes.find(t => t.name === themeName) || themes[0];
  }, [themeName, availableThemes]);

  const themeCss = useMemo(() => {
    if (!activeTheme) return "";
    
    let css = ":root {\n";
    const lightVars = activeTheme.cssVars.light || activeTheme.cssVars.dark;
    for (const [key, value] of Object.entries(lightVars)) {
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
      <link rel="icon" href={appIconUrl} sizes="any" />
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AppDataProvider>
          <AuthProvider>
            <StudentDataProvider>
              <StyleInjector />
              {children}
              <Toaster />
            </StudentDataProvider>
          </AuthProvider>
        </AppDataProvider>
      </body>
    </html>
  );
}
