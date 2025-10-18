
"use client";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { useUser, useAuth } from "@/firebase";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Metadata can't be used in a client component, but we can keep the object for reference
// or move it to a server component parent if needed.
// export const metadata: Metadata = {
//   title: "FinLit Classroom",
//   description: "Financial literacy for the next generation",
// };

function AppContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth && !user && !isUserLoading) {
        // If not logged in and not loading, we might be on a protected page.
        // The page itself will handle the redirect.
        // Or we could redirect to login from here if needed.
    }
  }, [user, isUserLoading, auth, router]);

  return <>{children}</>;
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
