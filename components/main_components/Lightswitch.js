// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/ThemeProvider.js
// Manages the light/dark theme for the entire site.
// Wraps the app in a React context so any component can read or toggle the theme.
//
// Light (cream) is the default and primary identity of the site.
// Dark mode is an opt-in toggle, stored as a preference in localStorage.

'use client';

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

// The context holds the current theme string and a toggle function.
// Any component can call useTheme() to access these.
const ThemeContext = createContext({ theme: 'light', toggle: () => {} });

// useTheme — the hook components use to read and toggle the theme.
// e.g. const { theme, toggle } = useTheme();
export function useTheme() {
  return useContext(ThemeContext);
}

// localStorage is the store; React subscribes to it rather than copying it into
// state on mount. That copy was the old approach — an effect that read storage
// and immediately setState, forcing a second render on every page load.
const THEME_KEY = 'ln-theme';
const listeners = new Set();

function subscribe(callback) {
  listeners.add(callback);
  // Another tab changing the preference should update this one too.
  window.addEventListener('storage', callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

// Returns a string, so React's equality check is stable between renders.
const readTheme   = () => (typeof window === 'undefined' ? 'light' : localStorage.getItem(THEME_KEY) || 'light');
const serverTheme = () => 'light';   // no storage during SSR — light is the default identity

// ThemeProvider — wraps the whole app in layout.js.
// Reads any saved preference, defaults to light, applies it to the <html> element.
export function Lightswitch({ children }) {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);

  // Mirroring onto <html> is a genuine external-system sync, which is what an
  // effect is for — no state is set here.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Toggle between light and dark, save the choice to localStorage
  function toggle() {
    localStorage.setItem(THEME_KEY, theme === 'dark' ? 'light' : 'dark');
    listeners.forEach(l => l());
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}