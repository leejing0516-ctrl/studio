
"use client";

import { AppDataProvider, AppDataContext } from "@/context/AppDataContext";
import { AuthProvider } from "@/context/AuthContext";
import { ReactNode, useEffect, useContext } from "react";

function DataInitializer() {
  const { fetchInitialData } = useContext(AppDataContext);

  useEffect(() => {
    const unsub = fetchInitialData();
    return () => unsub();
  }, [fetchInitialData]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppDataProvider>
      <DataInitializer />
      <AuthProvider>
        {children}
      </AuthProvider>
    </AppDataProvider>
  );
}
