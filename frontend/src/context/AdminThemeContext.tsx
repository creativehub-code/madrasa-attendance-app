'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface AdminThemeContextType {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  toggleDarkMode: () => void;
}

const AdminThemeContext = createContext<AdminThemeContextType>({
  darkMode: false,
  setDarkMode: () => {},
  toggleDarkMode: () => {},
});

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('admin_dark_mode');
    if (saved !== null) {
      setDarkMode(saved === 'true');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('admin_dark_mode', String(next));
      return next;
    });
  };

  const updateDarkMode = (val: boolean) => {
    setDarkMode(val);
    localStorage.setItem('admin_dark_mode', String(val));
  };

  return (
    <AdminThemeContext.Provider value={{ darkMode, setDarkMode: updateDarkMode, toggleDarkMode }}>
      <div className={darkMode ? 'dark' : ''}>
        <div className={`mx-auto min-h-screen max-w-md transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-[#f4f7f5] text-gray-900'}`}>
          {children}
        </div>
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}
