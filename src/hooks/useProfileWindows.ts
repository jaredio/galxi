import { useCallback, useRef, useState } from 'react';

import type { ProfileWindowState } from '../types/appState';

type OpenOptions = {
  startEditing?: boolean;
};

export const useProfileWindows = () => {
  const [profileWindows, setProfileWindows] = useState<ProfileWindowState[]>([]);
  const profileSpawnIndexRef = useRef(0);
  const profileZIndexRef = useRef(60);
  const profileEditNonceRef = useRef(0);

  const clampProfilePosition = useCallback((position: { x: number; y: number }) => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
    const width = 420;
    const paddingX = 24;
    const paddingY = 80;
    const maxX = Math.max(paddingX, viewportWidth - width - paddingX);
    const maxY = Math.max(paddingY, viewportHeight - 200);
    return {
      x: Math.min(Math.max(paddingX, position.x), maxX),
      y: Math.min(Math.max(paddingY, position.y), maxY),
    };
  }, []);

  const getProfileSpawnPosition = useCallback(() => {
    const offset = profileSpawnIndexRef.current++;
    const column = offset % 3;
    const row = Math.floor(offset / 3);
    return clampProfilePosition({
      x: 320 + column * 40,
      y: 110 + row * 32,
    });
  }, [clampProfilePosition]);

  const getNextProfileZIndex = useCallback(() => {
    profileZIndexRef.current += 1;
    return profileZIndexRef.current;
  }, []);

  const openProfileWindow = useCallback(
    (kind: ProfileWindowState['kind'], resourceId: string, options?: OpenOptions) => {
      const windowId = `${kind}:${resourceId}`;
      const shouldEdit = Boolean(options?.startEditing);
      const editNonce = shouldEdit ? ++profileEditNonceRef.current : 0;
      setProfileWindows((prev) => {
        const existing = prev.find((win) => win.id === windowId);
        const zIndex = getNextProfileZIndex();
        if (existing) {
          return prev.map((win) =>
            win.id === windowId
              ? { ...win, zIndex, editNonce: shouldEdit ? editNonce : win.editNonce }
              : win
          );
        }
        return [
          ...prev,
          {
            id: windowId,
            kind,
            resourceId,
            position: getProfileSpawnPosition(),
            zIndex,
            editNonce: shouldEdit ? editNonce : 0,
          },
        ];
      });
    },
    [getNextProfileZIndex, getProfileSpawnPosition]
  );

  const focusProfileWindow = useCallback(
    (windowId: string) => {
      setProfileWindows((prev) => {
        if (!prev.some((win) => win.id === windowId)) {
          return prev;
        }
        const zIndex = getNextProfileZIndex();
        return prev.map((win) => (win.id === windowId ? { ...win, zIndex } : win));
      });
    },
    [getNextProfileZIndex]
  );

  const moveProfileWindow = useCallback(
    (windowId: string, position: { x: number; y: number }) => {
      setProfileWindows((prev) =>
        prev.map((win) =>
          win.id === windowId ? { ...win, position: clampProfilePosition(position) } : win
        )
      );
    },
    [clampProfilePosition]
  );

  const closeProfileWindowById = useCallback((windowId: string) => {
    setProfileWindows((prev) => prev.filter((win) => win.id !== windowId));
  }, []);

  const closeProfileWindowsByResource = useCallback(
    (kind: ProfileWindowState['kind'], resourceId: string) => {
      setProfileWindows((prev) =>
        prev.filter((win) => !(win.kind === kind && win.resourceId === resourceId))
      );
    },
    []
  );

  const closeTopProfileWindow = useCallback(() => {
    setProfileWindows((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const topWindow = prev.reduce((highest, next) =>
        next.zIndex > highest.zIndex ? next : highest
      );
      return prev.filter((win) => win.id !== topWindow.id);
    });
  }, []);

  return {
    profileWindows,
    profileWindowCount: profileWindows.length,
    openProfileWindow,
    focusProfileWindow,
    moveProfileWindow,
    closeProfileWindowById,
    closeProfileWindowsByResource,
    closeTopProfileWindow,
  };
};
