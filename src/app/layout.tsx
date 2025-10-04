
"use client";

import { useContext, useEffect, useMemo } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppDataProvider, AppDataContext } from "@/context/AppDataContext";
import { StudentDataProvider } from "@/context/StudentDataContext";
import { themes } from "@/lib/themes";


const ThemeInjector = ({ children }: { children: React.ReactNode }) => {
  const { platformConfig } = useContext(AppDataContext);
  const themeName = useMemo(() => platformConfig?.theme || 'default', [platformConfig]);

  useEffect(() => {
    const theme = themes.find(t => t.name === themeName) || themes[0];
    
    const root = document.documentElement;
    root.classList.remove(...themes.map(t => t.name));
    root.classList.add(theme.name);

    if (theme.cssVars.dark) {
      Object.entries(theme.cssVars.dark).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
    }

  }, [themeName]);

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
