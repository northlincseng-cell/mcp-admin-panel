import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar darkMode={darkMode} onToggleDarkMode={() => setDarkMode((d) => !d)} />
      <main className="flex-1 overflow-y-auto p-6 bg-background">
        {children}
      </main>
    </div>
  );
}
