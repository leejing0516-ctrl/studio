
"use client";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import { themes, type Theme } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import type { CustomTheme, PlatformConfig, Student, Teacher, ClassInfo } from "@/lib/types";
import { useMemo, useEffect, useRef } from "react";
import { useSchoolStore } from "@/store/useSchoolStore";
import { syncAll } from "@/lib/firestoreFetchers";

// This component is responsible for taking server-fetched data
// and "hydrating" the client-side Zustand store with it.
// It runs only once on initial load.
function StoreHydration() {
  const isHydrated = useRef(false);

  useEffect(() => {
    if (!isHydrated.current) {
      syncAll().then(initialState => {
        useSchoolStore.setState({
          config: initialState.config,
          students: initialState.students,
          teachers: initialState.teachers,
          classes: initialState.classes,
          loading: false, // Data is now loaded
        });
        isHydrated.current = true;
      });
    }
  }, []);

  return null;
}

// This component applies the dynamic theme based on the config.
// It's a client component because it needs to access the Zustand store.
function StyleInjector() {
  const { config: platformConfig } = useSchoolStore();

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
        {/* StyleInjector is now a client component, must be in a client-only wrapper or in the client-side tree */}
      </head>
      <body className="font-body antialiased">
        {/* 2. Pass initial data to the client to hydrate the store. */}
        <StoreHydration />
        <AuthProvider>
          {/* This is a client component that can safely access the hydrated store */}
          <StyleInjector />
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
