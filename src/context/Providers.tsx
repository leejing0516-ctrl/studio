"use client";

import { AppDataProvider } from "@/context/AppDataContext";
import { StudentDataProvider } from "@/context/StudentDataContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <StudentDataProvider>
        {children}
      </StudentDataProvider>
    </AppDataProvider>
  );
}
