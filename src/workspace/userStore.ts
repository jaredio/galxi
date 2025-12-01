export type GalxiUser = {
  id: string;
  name: string;
  createdAt: string;
};

const USER_KEY = 'galxi-user';

const randomId = () =>
  typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const loadUser = (): GalxiUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GalxiUser;
    if (parsed?.id && parsed?.name) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const saveUser = (user: GalxiUser): GalxiUser => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
  return user;
};

export const saveNewUser = (name: string): GalxiUser => {
  const user: GalxiUser = {
    id: randomId(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  return saveUser(user);
};

export const clearUser = () => {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
};
