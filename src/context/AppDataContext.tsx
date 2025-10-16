
"use client";

import React, { useMemo, useEffect, useRef, PropsWithChildren } from "react";
import { useSchoolStore } from "@/store/useSchoolStore";
import { themes, type Theme } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import { collection, onSnapshot, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlatformConfig, Student, Teacher, ClassInfo } from "@/lib/types";

// This component is responsible for taking server-fetched data
// and "hydrating" the client-side Zustand store with it.
function StoreHydration() {
    const { setLoading, setConfig, setStudents, setTeachers, setClasses } = useSchoolStore();
    const isInitialized = useRef(false);

    useEffect(() => {
        if (!db || isInitialized.current) return;
        isInitialized.current = true;

        setLoading(true);

        const unsubscribers: (() => void)[] = [];

        const fetchDataAndSubscribe = async () => {
            try {
                // Initial atomic fetch
                const [configSnap, studentsSnap, teachersSnap, classesSnap] = await Promise.all([
                    getDoc(doc(db, "config", "main")),
                    getDocs(collection(db, "students")),
                    getDocs(collection(db, "teachers")),
                    getDocs(collection(db, "classes")),
                ]);

                if (configSnap.exists()) setConfig(configSnap.data() as PlatformConfig);
                setStudents(studentsSnap.docs.map(d => ({ ...d.data(), _docId: d.id } as Student)));
                setTeachers(teachersSnap.docs.map(d => ({ ...d.data(), _docId: d.id } as Teacher)));
                setClasses(classesSnap.docs.map(d => ({ ...d.data(), _docId: d.id } as ClassInfo)));
                
                // All initial data is loaded, set loading to false
                setLoading(false);

                // Now, set up real-time listeners for subsequent updates
                unsubscribers.push(onSnapshot(doc(db, "config", "main"), (docSnap) => {
                    if (docSnap.exists()) setConfig(docSnap.data() as PlatformConfig);
                }));
                unsubscribers.push(onSnapshot(collection(db, "students"), (snapshot) => {
                    setStudents(snapshot.docs.map(d => ({ ...d.data(), _docId: d.id } as Student)));
                }));
                unsubscribers.push(onSnapshot(collection(db, "teachers"), (snapshot) => {
                    setTeachers(snapshot.docs.map(d => ({ ...d.data(), _docId: d.id } as Teacher)));
                }));
                unsubscribers.push(onSnapshot(collection(db, "classes"), (snapshot) => {
                    setClasses(snapshot.docs.map(d => ({ ...d.data(), _docId: d.id } as ClassInfo)));
                }));

            } catch (error) {
                console.error("Error during initial data fetch:", error);
                setLoading(false); // Stop loading even if there's an error
            }
        };

        fetchDataAndSubscribe();

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
