"use client";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { themes, type Theme } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import type { CustomTheme } from "@/lib/types";
import { useState, useMemo, useEffect } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppDataProvider } from "@/context/AppDataContext";
import { StudentDataProvider } from "@/context/StudentDataContext";

function StyleInjector() {
  const [themeName, setThemeName] = useState('makeup-pink');
  const [appIconUrl, setAppIconUrl] = useState(DEFAULT_APP_ICON_URL);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "main"), (doc) => {
      if (doc.exists()) {
        const config = doc.data();
        setThemeName(config.theme || 'makeup-pink');
        setAppIconUrl(config.appIconUrl || DEFAULT_APP_ICON_URL);
      }
    });
    return () => unsub();
  }, []);

  const activeTheme = useMemo(() => {
    return themes.find(t => t.name === themeName) || themes.find(t => t.name === 'makeup-pink');
  }, [themeName]);

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
        <StyleInjector />
      </head>
      <body className="font-body antialiased">
          <StudentDataProvider>
            <AppDataProvider>
              {children}
            </AppDataProvider>
          </StudentDataProvider>
          <Toaster />
      </body>
    </html>
  );
}
