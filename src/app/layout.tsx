

"use client";

import { useContext, useEffect, useMemo } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppDataProvider, AppDataContext } from "@/context/AppDataContext";
import { StudentDataProvider } from "@/context/StudentDataContext";
import { themes } from "@/lib/themes";
import { APP_ICON_URL } from "@/lib/config";


const ThemeInjector = ({ children }: { children: React.ReactNode }) => {
  const { platformConfig } = useContext(AppDataContext);
  const themeName = useMemo(() => platformConfig?.theme || 'default', [platformConfig]);
  const customTheme = useMemo(() => platformConfig?.customTheme, [platformConfig]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...themes.map(t => t.name));
    
    if (themeName === 'custom' && customTheme) {
        Object.entries(customTheme).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
        });
    } else {
      const theme = themes.find(t => t.name === themeName) || themes.find(t => t.name === 'default')!;
      root.classList.add(theme.name);
       if (theme.cssVars.dark) {
        Object.entries(theme.cssVars.dark).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
        });
      }
    }

  }, [themeName, customTheme]);

  return <>{children}</>;
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
        <link rel="apple-touch-icon" href={APP_ICON_URL} />
        <meta name="theme-color" content="#000000" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AppDataProvider>
          <ThemeInjector>
            <StudentDataProvider>
                {children}
                <Toaster />
            </StudentDataProvider>
          </ThemeInjector>
        </AppDataProvider>
      </body>
    </html>
  );
}
