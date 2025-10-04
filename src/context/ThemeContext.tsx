
"use client";

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { themes } from '@/lib/themes';
import { AppDataContext } from './AppDataContext';

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { platformConfig } = useContext(AppDataContext);

  const themeName = useMemo(() => platformConfig?.theme || 'default', [platformConfig]);

  useEffect(() => {
    const theme = themes.find(t => t.name === themeName) || themes[0];
    
    const root = document.documentElement;
    
    if (theme.cssVars.dark) {
      Object.entries(theme.cssVars.dark).forEach(([key, value]) => {
        root.style.setProperty(`--${key}-hsl`, value);
      });
    }

  }, [themeName]);

  return <>{children}</>;
};

export { ThemeProvider };
