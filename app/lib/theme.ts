// ============================================
// MS Fix — Theme System
// Violet / Pink Palette + Dark Mode Default
// ============================================

export const colors = {
  // Light Mode
  light: {
    bg: '#faf9fc',
    bgAlt: '#f5f3ff',
    card: '#ffffff',
    cardAlt: '#f9fafb',
    border: '#e9e5f5',
    borderStrong: '#d8d0ee',
    text: '#1a1625',
    textMuted: '#6b6680',
    textSubtle: '#9c96b3',
    primary: '#8b5cf6',
    primaryHover: '#7c3aed',
    primaryLight: '#ede9fe',
    accent: '#ec4899',
    accentHover: '#db2777',
    accentLight: '#fce7f3',
    success: '#10b981',
    successLight: '#d1fae5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    info: '#3b82f6',
    infoLight: '#dbeafe',
  },
  
  // Dark Mode
  dark: {
    bg: '#0f0a1a',
    bgAlt: '#150e22',
    card: '#1a0f2e',
    cardAlt: '#231740',
    border: '#2d1f4a',
    borderStrong: '#3d2b5f',
    text: '#f5f3ff',
    textMuted: '#b8b0d0',
    textSubtle: '#8479a0',
    primary: '#a78bfa',
    primaryHover: '#c4b5fd',
    primaryLight: '#2d1f4a',
    accent: '#f472b6',
    accentHover: '#ec4899',
    accentLight: '#3d1f33',
    success: '#34d399',
    successLight: '#064e3b',
    warning: '#fbbf24',
    warningLight: '#78350f',
    danger: '#f87171',
    dangerLight: '#7f1d1d',
    info: '#60a5fa',
    infoLight: '#1e3a8a',
  },
};

// ============================================
// Theme helper — يرجع الـ theme حسب الوضع
// ============================================
export type ThemeMode = 'light' | 'dark';

export function getTheme(mode: ThemeMode) {
  return mode === 'dark' ? colors.dark : colors.light;
}

// ============================================
// Common class combinations
// ============================================
export const classes = {
  card: 'rounded-2xl border transition-all duration-300',
  cardHover: 'hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5',
  button: 'rounded-xl font-bold transition-all duration-200 active:scale-95',
  buttonPrimary: 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-md hover:shadow-lg',
  buttonAccent: 'bg-[#ec4899] hover:bg-[#db2777] text-white shadow-md hover:shadow-lg',
  buttonGhost: 'border hover:bg-black/5 dark:hover:bg-white/5',
  input: 'rounded-xl border p-3.5 transition-all duration-200 focus:outline-none focus:ring-2',
  fadeIn: 'animate-fadeIn',
  slideUp: 'animate-slideUp',
  scaleIn: 'animate-scaleIn',
};

// ============================================
// Animations (يُستخدم مع globals.css)
// ============================================
export const animationDurations = {
  fast: 150,
  normal: 300,
  slow: 500,
  splash: 2000,
};