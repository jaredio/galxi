import { create } from 'zustand';

import type { CanvasGroup, NetworkLink, NetworkNode } from '../types/graph';

type Updater<T> = T | ((current: T) => T);

const resolveUpdater = <T>(updater: Updater<T>, current: T): T =>
  typeof updater === 'function' ? (updater as (value: T) => T)(current) : updater;

type GraphStore = {
  nodes: NetworkNode[];
  links: NetworkLink[];
  groups: CanvasGroup[];
  setNodes: (updater: Updater<NetworkNode[]>) => void;
  setLinks: (updater: Updater<NetworkLink[]>) => void;
  setGroups: (updater: Updater<CanvasGroup[]>) => void;
  replaceGraph: (payload: { nodes: NetworkNode[]; links: NetworkLink[]; groups?: CanvasGroup[] }) => void;
};

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  links: [],
  groups: [],
  setNodes: (updater) =>
    set((state) => ({
      nodes: resolveUpdater(updater, state.nodes),
    })),
  setLinks: (updater) =>
    set((state) => ({
      links: resolveUpdater(updater, state.links),
    })),
  setGroups: (updater) =>
    set((state) => ({
      groups: resolveUpdater(updater, state.groups),
    })),
  replaceGraph: ({ nodes, links, groups }) =>
    set({
      nodes: nodes.map((node) => ({ ...node })),
      links: links.map((link) => ({ ...link })),
      groups: groups ? groups.map((group) => ({ ...group })) : [],
    }),
}));
