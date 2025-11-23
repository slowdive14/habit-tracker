import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Theme types
export type Theme = 'brutalist' | 'zen-garden' | 'retro-pixel' | 'neumorphic';

export interface ThemeConfig {
  id: Theme;
  name: string;
  displayName: string;
  description: string;
  colors: string[];
  emoji: string;
}

// Theme configurations
export const THEMES: ThemeConfig[] = [
  {
    id: 'brutalist',
    name: 'Brutalist',
    displayName: 'BRUTALIST',
    description: 'Raw. Bold. Uncompromising.',
    colors: ['#000000', '#FFFFFF', '#FF4500'],
    emoji: '⚫',
  },
  {
    id: 'zen-garden',
    name: 'Zen Garden',
    displayName: 'ZEN GARDEN',
    description: 'Calm. Organic. Peaceful.',
    colors: ['#2D5016', '#E8DCC4', '#C97D60'],
    emoji: '🌿',
  },
  {
    id: 'retro-pixel',
    name: 'Retro Pixel',
    displayName: 'RETRO PIXEL',
    description: 'Nostalgic. Playful. 8-Bit.',
    colors: ['#1A1A2E', '#FF6B6B', '#4ECDC4'],
    emoji: '🎮',
  },
  {
    id: 'neumorphic',
    name: 'Neumorphic',
    displayName: 'NEUMORPHIC',
    description: 'Soft. Modern. Minimal.',
    colors: ['#E0E5EC', '#6C63FF', '#A3B1C6'],
    emoji: '☁️',
  },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  themeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Load saved theme from localStorage or default to brutalist
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('habitflow-theme');
    return (saved as Theme) || 'brutalist';
  });

  // Get current theme config
  const themeConfig = THEMES.find(t => t.id === theme) || THEMES[0];

  // Set theme function
  const setTheme = (newTheme: Theme) => {
    console.log('Switching theme to:', newTheme);

    // Add transition class
    document.documentElement.classList.add('theme-transitioning');

    // Update state and localStorage
    setThemeState(newTheme);
    localStorage.setItem('habitflow-theme', newTheme);

    // Update data-theme attribute
    document.documentElement.setAttribute('data-theme', newTheme);

    // Remove transition class after animation
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 500);
  };

  // Toggle between themes
  const toggleTheme = () => {
    const newTheme = theme === 'brutalist' ? 'zen-garden' : 'brutalist';
    setTheme(newTheme);
  };

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    console.log('Theme initialized:', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
