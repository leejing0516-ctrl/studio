

"use client";

import { AppDataProvider } from "@/context/AppDataContext";
import { StudentDataProvider } from "@/context/StudentDataContext";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

// This file is no longer used due to architectural changes.
// The providers are now handled directly in the root layout.
export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
