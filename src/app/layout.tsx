
"use client"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// We can't use the metadata export in a 'use client' component.
// We'll manage the title dynamically if needed.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])
  
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <title>FinLit Classroom</title>
        <meta name="description" content="Financial literacy for the next generation" />
      </head>
      <body className={inter.className}>
        {isClient ? children : null}
        <Toaster />
      </body>
    </html>
  );
}
