
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/context/Providers";
import { themes } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import type { CustomTheme } from "@/lib/types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// This is now a Server Component
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let platformConfig = null;
  try {
    const configDoc = await getDoc(doc(db, "config", "main"));
    if (configDoc.exists()) {
      platformConfig = configDoc.data();
    }
  } catch (error) {
    console.error("Failed to fetch platform config on server:", error);
  }

  const appIconUrl = platformConfig?.appIconUrl || DEFAULT_APP_ICON_URL;
  const themeName = platformConfig?.theme || 'default';
  const customTheme = platformConfig?.customTheme;

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
    
  const themeVars = `:root {\n${cssText}\n}`;

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
        <style dangerouslySetInnerHTML={{ __html: themeVars }} />
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
