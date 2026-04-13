// components/ThemeProvider.js
// Manages the light/dark theme for the entire site.
// Wraps the app in a React context so any component can read or toggle the theme.
//
// Theme priority on load:
// 1. If the user has manually set a theme, use that (stored in localStorage)
// 2. Otherwise, auto-detect based on sunrise/sunset for Rocklin, CA
// 3. If the API fails, fall back to time-of-day (dark before 7am and after 7pm)

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

// Fetches real sunrise/sunset times for Rocklin, CA from a free API.
// Returns 'dark' if it's currently before sunrise or after sunset, 'light' otherwise.
async function getSunsetTheme() {
  try {
    const res = await fetch(
      'https://api.sunrise-sunset.org/json?lat=38.7907&lng=-121.2358&formatted=0',
      { cache: 'no-store' }
    );
    const data = await res.json();
    const sunrise = new Date(data.results.sunrise);
    const sunset = new Date(data.results.sunset);
    const now = new Date();
    return (now < sunrise || now > sunset) ? 'dark' : 'light';
  } catch {
    // API failed — fall back to simple hour-based check
    const hour = new Date().getHours();
    return (hour >= 19 || hour < 7) ? 'dark' : 'light';
  }
}

// ThemeProvider — wraps the whole app in layout.js.
// Handles reading saved preference, auto-detecting theme, and applying it to the <html> element.
export function Lightswitch({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false); // prevents flash of wrong theme on first render

  // On mount: check localStorage first, then auto-detect from sunrise/sunset
  useEffect(() => {
    const stored = localStorage.getItem('ln-theme');
    if (stored) {
      // User has a saved preference — use it immediately
      setTheme(stored);
      document.documentElement.setAttribute('data-theme', stored);
      setMounted(true);
    } else {
      // No preference saved — detect based on time of day at your location
      getSunsetTheme().then(auto => {
        setTheme(auto);
        document.documentElement.setAttribute('data-theme', auto);
        setMounted(true);
      });
    }
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