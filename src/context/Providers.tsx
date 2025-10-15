
"use client";

import { AppDataProvider, AppDataContext } from "@/context/AppDataContext";
import { AuthProvider } from "@/context/AuthContext";
import { ReactNode, useEffect, useContext } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlatformConfig } from "@/lib/types";

const checkMarketOpen = (config: PlatformConfig | null) => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const openHour = config?.marketOpenHour ?? 9;
    const closeHour = config?.marketCloseHour ?? 14;
    return day >= 1 && day <= 5 && hour >= openHour && hour < closeHour;
};

// This component now lives inside the Providers wrapper and handles all data fetching.
function DataInitializer() {
  const { 
      _setRewards, 
      _setStocks, 
      _setClasses, 
      _setStudents, 
      _setTeachers, 
      _setPlatformConfig,
      _setIsMarketOpen,
      platformConfig
  } = useContext(AppDataContext);

  useEffect(() => {
    const collectionsToListen = [
        { name: 'classes', setter: _setClasses },
        { name: 'rewards', setter: _setRewards },
        { name: 'stocks', setter: _setStocks },
        { name: 'students', setter: _setStudents },
        { name: 'teachers', setter: _setTeachers },
    ];

    const unsubs = collectionsToListen.map(c => {
        return onSnapshot(collection(db, c.name), (snapshot) => {
            c.setter(snapshot.docs.map(d => ({ ...d.data(), _docId: d.id })));
        });
    });
    
    const unsubConfig = onSnapshot(doc(db, 'config', 'main'), (doc) => {
        if (doc.exists()) {
            _setPlatformConfig(doc.data() as PlatformConfig);
        }
    });

    return () => {
      unsubs.forEach(unsub => unsub());
      unsubConfig();
    };
  // We pass the setters directly, so this should not re-run unnecessarily.
  }, [_setClasses, _setRewards, _setStocks, _setStudents, _setTeachers, _setPlatformConfig]);

  useEffect(() => {
    _setIsMarketOpen(checkMarketOpen(platformConfig));
    const marketInterval = setInterval(() => {
      _setIsMarketOpen(checkMarketOpen(platformConfig));
    }, 60000);
    return () => clearInterval(marketInterval);
  }, [platformConfig, _setIsMarketOpen]);


  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppDataProvider>
      <AuthProvider>
        <DataInitializer />
        {children}
      </AuthProvider>
    </AppDataProvider>
  );
}
