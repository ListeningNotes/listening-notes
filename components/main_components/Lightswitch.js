// components/ThemeProvider.js
// Manages the light/dark theme for the entire site.
// Wraps the app in a React context so any component can read or toggle the theme.
//
// Light (cream) is the default and primary identity of the site.
// Dark mode is an opt-in toggle, stored as a preference in localStorage.

'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// The context holds the current theme string and a toggle function.
// Any component can call useTheme() to access these.
const ThemeContext = createContext({ theme: 'light', toggle: () => {} });

// useTheme — the hook components use to read and toggle the theme.
// e.g. const { theme, toggle } = useTheme();
export function useTheme() {
  return useContext(ThemeContext);
}

// ThemeProvider — wraps the whole app in layout.js.
// Reads any saved preference, defaults to light, applies it to the <html> element.
export function Lightswitch({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false); // prevents flash of wrong theme on first render

  // On mount: use the saved preference if present, otherwise default to light
  useEffect(() => {
    const stored = localStorage.getItem('ln-theme');
    const initial = stored || 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
    setMounted(true);
  }, []);

  // Keep the data-theme attribute on <html> in sync whenever theme changes
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme, mounted]);

  // Toggle between light and dark, save the choice to localStorage
  function toggle() {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('ln-theme', next);
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}