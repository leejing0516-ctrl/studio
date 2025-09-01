import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { StudentDataProvider } from "@/context/StudentDataContext";
import { RewardProvider } from "@/context/RewardContext";

export const metadata: Metadata = {
  title: "FinLit Classroom",
  description: "A vibrant rewards and financial literacy app for students.",
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
        <StudentDataProvider>
          <RewardProvider>
            {children}
            <Toaster />
          </RewardProvider>
        </StudentDataProvider>
      </body>
    </html>
  );
}
