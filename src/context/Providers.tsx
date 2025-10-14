
"use client";

import { AppDataProvider } from "@/context/AppDataContext";
import { StudentDataProvider } from "@/context/StudentDataContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StudentDataProvider>
      <AppDataProvider>
        {children}
      </AppDataProvider>
    </StudentDataProvider>
  );
}
