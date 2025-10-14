
"use client";

import { AppDataProvider } from "@/context/AppDataContext";
import { StudentDataProvider } from "@/context/StudentDataContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StudentDataProvider>
      <AppDataProvider>
        {children}
      </AppDataProvider>
    </StudentDataProvider>
  );
}
