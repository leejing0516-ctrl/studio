
"use client";

import React, { useMemo, useEffect, useRef, PropsWithChildren } from "react";
import { useSchoolStore } from "@/store/useSchoolStore";
import { themes, type Theme } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlatformConfig, Student, Teacher, ClassInfo } from "@/lib/types";


// This component is responsible for taking server-fetched data
// and "hydrating" the client-side Zustand store with it.
// It now uses onSnapshot for real-time updates for all core data collections.
function StoreHydration() {
  const isHydrated = useRef(false);

  useEffect(() => {
    if (!db) return;
    
    const unsubscribers: (() => void)[] = [];
    const collectionsToSync = {
      config: { ref: collection(db, "config"), setter: useSchoolStore.getState().setConfig, isSingleDoc: true },
      students: { ref: collection(db, "students"), setter: useSchoolStore.getState().setStudents },
      teachers: { ref: collection(db, "teachers"), setter: useSchoolStore.getState().setTeachers },
      classes: { ref: collection(db, "classes"), setter: useSchoolStore.getState().setClasses },
    };

    let initialLoadCompleted = 0;
    const totalCollections = Object.keys(collectionsToSync).length;

    const checkAllLoaded = () => {
      initialLoadCompleted++;
      if (initialLoadCompleted >= totalCollections) {
        useSchoolStore.getState().setLoading(false);
      }
    };
    
    for (const [key, { ref, setter, isSingleDoc }] of Object.entries(collectionsToSync)) {
        if (isSingleDoc) {
            const docRef = doc(ref, 'main');
            const unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    (setter as (v: PlatformConfig) => void)(docSnap.data() as PlatformConfig);
                }
                if (!isHydrated.current) checkAllLoaded();
            }, (error) => {
                console.error(`Failed to listen to ${key} changes:`, error);
                if (!isHydrated.current) checkAllLoaded();
            });
            unsubscribers.push(unsubscribe);
        } else {
             const unsubscribe = onSnapshot(ref, (querySnapshot) => {
                const data = querySnapshot.docs.map(d => ({ ...d.data(), _docId: d.id }));
                (setter as (v: any[]) => void)(data);
                if (!isHydrated.current) checkAllLoaded();
            }, (error) => {
                console.error(`Failed to listen to ${key} changes:`, error);
                if (!isHydrated.current) checkAllLoaded();
            });
            unsubscribers.push(unsubscribe);
        }
    }
    
    isHydrated.current = true;

    return () => {
      unsubscribers.forEach(unsub => unsub()); // Clean up all listeners on component unmount
    };
  }, []);

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
