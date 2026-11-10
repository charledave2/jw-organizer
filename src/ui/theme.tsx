import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAppSetting, setAppSetting } from '../data/database';

export type ThemeMode = 'light' | 'dark';
export type ThemeColors = {
  canvas: string; surface: string; ink: string; muted: string; line: string;
  green: string; greenSoft: string; greenDark: string; orange: string; danger: string;
};

const lightColors: ThemeColors = {
  canvas: '#F7F8F6', surface: '#FFFFFF', ink: '#171A18', muted: '#7C827E', line: '#E7EAE6',
  green: '#315E4B', greenSoft: '#E7EFE9', greenDark: '#214333', orange: '#B66E3C', danger: '#B94C4C',
};
const darkColors: ThemeColors = {
  canvas: '#111714', surface: '#1B2420', ink: '#F1F4F1', muted: '#A2ADA6', line: '#303B35',
  green: '#3F7857', greenSoft: '#26392E', greenDark: '#B1D7BE', orange: '#E4A36F', danger: '#F08A83',
};

type ThemeContextValue = { colors: ThemeColors; mode: ThemeMode; setMode: (mode: ThemeMode) => Promise<void> };
const ThemeContext = createContext<ThemeContextValue>({ colors: lightColors, mode: 'light', setMode: async () => {} });

export function AppThemeProvider({ children }: React.PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  useEffect(() => { getAppSetting('theme_mode', 'light').then((value) => setModeState(value === 'dark' ? 'dark' : 'light')).catch(() => {}); }, []);
  const setMode = useCallback(async (next: ThemeMode) => { await setAppSetting('theme_mode', next); setModeState(next); }, []);
  const value = useMemo(() => ({ colors: mode === 'dark' ? darkColors : lightColors, mode, setMode }), [mode, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() { return useContext(ThemeContext); }

export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30 };
