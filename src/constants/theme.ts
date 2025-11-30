export type Theme = {
  accent: string;
  accentHover: string;
  background: string;
  surface: string;
  hover: string;
  edge: string;
  textPrimary: string;
  textSecondary: string;
  nodeFill: string;
  nodeBorder: string;
  nodeGlow: string;
  iconAccent: string;
};

export const baseTheme: Theme = {
  accent: '#3ECF8E',
  accentHover: '#2EB67D',
  background: '#0F1117',
  surface: '#1C1F26',
  hover: '#16181E',
  edge: '#2B2F36',
  textPrimary: '#E5E7EB',
  textSecondary: '#9CA3AF',
  nodeFill: '#1C1F26',
  nodeBorder: '#2B2F36',
  nodeGlow: '#3ECF8E',
  iconAccent: '#3ECF8E',
};

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
};

export const accent = baseTheme.accent;
export const accentHover = baseTheme.accentHover;
export const edgeBase = baseTheme.edge;
export const textPrimary = baseTheme.textPrimary;
export const textSecondary = baseTheme.textSecondary;
