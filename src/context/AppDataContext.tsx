
"use client";

import React, { useMemo, useEffect, useRef, PropsWithChildren } from "react";
import { useSchoolStore } from "@/store/useSchoolStore";
import { syncAll } from "@/lib/firestoreFetchers";
import { themes, type Theme } from "@/lib/themes";
import { DEFAULT_APP_ICON_URL } from "@/lib/config";

// This component is responsible for taking server-fetched data
// and "hydrating" the client-side Zustand store with it.
// It runs only once on initial load.
function StoreHydration() {
  const isHydrated = useRef(false);

  useEffect(() => {
    if (!isHydrated.current) {
      syncAll().then(initialState => {
        useSchoolStore.setState({
          config: initialState.config,
          students: initialState.students,
          teachers: initialState.teachers,
          classes: initialState.classes,
          loading: false, // Data is now loaded
        });
        isHydrated.current = true;
      });
    }
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
