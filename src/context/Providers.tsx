
"use client";

import { AppDataProvider } from "@/context/AppDataContext";
import { StudentDataProvider } from "@/context/StudentDataContext";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/') {
    return (
      <StudentDataProvider>
        <AppDataProvider>
          {children}
        </AppDataProvider>
      </StudentDataProvider>
    );
  }

  return (
     <StudentDataProvider>
        <AppDataProvider>
          {children}
        </AppDataProvider>
    </StudentDataProvider>
  )
}
