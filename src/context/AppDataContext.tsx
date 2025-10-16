
"use client";

import React, { useMemo, useEffect, useRef, PropsWithChildren } from "react";
import { useSchoolStore } from "@/store/useSchoolStore";
import { themes, type Theme } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import { collection, onSnapshot, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlatformConfig, Student, Teacher, ClassInfo } from "@/lib/types";
import { fetchAllStudents, fetchAllTeachers, fetchAllClasses, fetchConfigMain } from "@/lib/firestoreFetchers";


// This component is responsible for taking server-fetched data
// and "hydrating" the client-side Zustand store with it.
function StoreHydration() {
    const { setLoading, setConfig, setStudents, setTeachers, setClasses } = useSchoolStore();
    const isInitialized = useRef(false);

    useEffect(() => {
        if (!db || isInitialized.current) return;
        isInitialized.current = true; // Mark as initialized to prevent re-running

        setLoading(true);

        const syncData = async () => {
            try {
                // Fetch initial data once to ensure the app is usable quickly
                const [initialConfig, initialStudents, initialTeachers, initialClasses] = await Promise.all([
                    fetchConfigMain(),
                    fetchAllStudents(),
                    fetchAllTeachers(),
                    fetchAllClasses()
                ]);
                setConfig(initialConfig);
                setStudents(initialStudents);
                setTeachers(initialTeachers);
                setClasses(initialClasses);
            } catch (error) {
                console.error("Initial data fetch failed:", error);
            } finally {
                setLoading(false); // Stop loading after initial fetch regardless of snapshot setup
            }
        };

        syncData();
        
        // Set up real-time listeners after initial load
        const unsubscribers = [
            onSnapshot(doc(db, "config", "main"), (docSnap) => {
                if (docSnap.exists()) {
                    setConfig(docSnap.data() as PlatformConfig);
                }
            }, (error) => console.error("Config snapshot error:", error)),
            onSnapshot(collection(db, "students"), (snapshot) => {
                setStudents(snapshot.docs.map(d => ({ ...d.data(), _docId: d.id } as Student)));
            }, (error) => console.error("Students snapshot error:", error)),
            onSnapshot(collection(db, "teachers"), (snapshot) => {
                setTeachers(snapshot.docs.map(d => ({ ...d.data(), _docId: d.id } as Teacher)));
            }, (error) => console.error("Teachers snapshot error:", error)),
            onSnapshot(collection(db, "classes"), (snapshot) => {
                setClasses(snapshot.docs.map(d => ({ ...d.data(), _docId: d.id } as ClassInfo)));
            }, (error) => console.error("Classes snapshot error:", error)),
        ];

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [setLoading, setConfig, setStudents, setTeachers, setClasses]);

    return null;
}


// This component applies the dynamic theme based on the config.
function StyleInjector() {
  const { config: platformConfig } = useSchoolStore();

  const themeName = platformConfig?.theme || 'default';
  const appIconUrl = platformConfig?.appIconUrl || DEFAULT_APP_ICON_URL;

  const availableThemes = useMemo(() => {
    return [...themes, ...(platformConfig?.customThemes || [])];
  }, [platformConfig?.customThemes]);

  const activeTheme = useMemo(() => {
    return availableThemes.find(t => t.name === themeName) || themes[0];
  }, [themeName, availableThemes]);

  const themeCss = useMemo(() => {
    if (!activeTheme) return "";
    
    let css = ":root {\n";
    const lightVars = activeTheme.cssVars.light || activeTheme.cssVars.dark;
    for (const [key, value] of Object.entries(lightVars)) {
      css += `  --${key}: ${value};\n`;
    }

     // Add specific card theme variables
    if(themeName === 'default' || themeName === 'business-blue' || themeName === 'finance' || themeName === 'briefing' || themeName === 'forest' || themeName === 'rose' || themeName === 'ocean' || themeName === 'neutral') {
        css += `  --reward-card-school: ${lightVars['primary']};\n`;
        css += `  --reward-card-school-foreground: ${lightVars['primary-foreground']};\n`;
        css += `  --reward-card-class: ${lightVars['secondary']};\n`;
        css += `  --reward-card-class-foreground: ${lightVars['secondary-foreground']};\n`;
    } else {
        css += `  --reward-card-school: hsl(var(--primary));\n`;
        css += `  --reward-card-school-foreground: hsl(var(--primary-foreground));\n`;
        css += `  --reward-card-class: hsl(var(--secondary));\n`;
        css += `  --reward-card-class-foreground: hsl(var(--secondary-foreground));\n`;
    }

    css += "}\n";

    if (activeTheme.cssVars.dark) {
      css += ".dark {\n";
       for (const [key, value] of Object.entries(activeTheme.cssVars.dark)) {
         css += `  --${key}: ${value};\n`;
       }
       css += "}\n";
    }

    return css;
  }, [activeTheme, themeName]);

  return (
    <>
      <style>{themeCss}</style>
      <link rel="icon" href={appIconUrl} sizes="any" />
      <link rel="apple-touch-icon" href={appIconUrl} />
    </>
  );
}

// This provider component wraps the hydration and style injection.
export function AppDataProvider({ children }: PropsWithChildren) {
  return (
    <>
      <StoreHydration />
      <StyleInjector />
      {children}
    </>
  );
}
