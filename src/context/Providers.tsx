
"use client";

import { AppDataProvider } from "@/context/AppDataContext";
import { AuthProvider } from "@/context/AuthContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppDataProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
    </AppDataProvider>
  );
}
