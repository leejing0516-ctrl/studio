
"use client";

import { AppDataProvider } from "@/context/AppDataContext";
import { StudentDataProvider } from "@/context/StudentDataContext";
import { ReactNode, useEffect, useContext } from "react";
import { AppDataContext } from "@/context/AppDataContext";

function AppDataInitializer({ children }: { children: ReactNode }) {
  const { fetchInitialData } = useContext(AppDataContext);

  useEffect(() => {
    const unsub = fetchInitialData();
    return () => {
      unsub();
    };
  }, [fetchInitialData]);
  
  return <>{children}</>;
}


export function Providers({ children }: { children: ReactNode }) {
  return (
    <StudentDataProvider>
      <AppDataProvider>
        <AppDataInitializer>
          {children}
        </AppDataInitializer>
      </AppDataProvider>
    </StudentDataProvider>
  );
}
