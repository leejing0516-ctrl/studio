
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { StudentDataProvider } from "@/context/StudentDataContext";
import { AppDataProvider } from "@/context/AppDataContext";


export const metadata: Metadata = {
  title: "南梓實小虛擬銀行",
  description: "一個為學生設計，充滿活力的獎勵與金融素養應用程式。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AppDataProvider>
          <StudentDataProvider>
              {children}
              <Toaster />
          </StudentDataProvider>
        </AppDataProvider>
      </body>
    </html>
  );
}
