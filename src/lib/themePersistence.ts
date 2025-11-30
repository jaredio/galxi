import type { Theme } from '../constants/theme';

const THEME_KEY_PREFIX = 'galxi-theme';

const makeThemeKey = (workspaceId?: string) =>
  workspaceId ? `${THEME_KEY_PREFIX}:${workspaceId}` : THEME_KEY_PREFIX;

export const saveThemeForWorkspace = (theme: Theme, workspaceId?: string) => {
  try {
    localStorage.setItem(makeThemeKey(workspaceId), JSON.stringify(theme));
  } catch {
    /* ignore */
  }
};

export const loadThemeForWorkspace = (workspaceId?: string): Theme | null => {
  try {
    const raw = localStorage.getItem(makeThemeKey(workspaceId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as Theme;
  } catch {
    return null;
  }
};

export const clearThemeForWorkspace = (workspaceId?: string) => {
  try {
    localStorage.removeItem(makeThemeKey(workspaceId));
  } catch {
    /* ignore */
  }
};
