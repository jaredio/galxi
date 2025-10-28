import { create } from 'zustand';

import type { NetworkLink, NetworkNode } from '../types/graph';

type Updater<T> = T | ((current: T) => T);

const resolveUpdater = <T>(updater: Updater<T>, current: T): T =>
  typeof updater === 'function' ? (updater as (value: T) => T)(current) : updater;

type GraphStore = {
  nodes: NetworkNode[];
  links: NetworkLink[];
  setNodes: (updater: Updater<NetworkNode[]>) => void;
  setLinks: (updater: Updater<NetworkLink[]>) => void;
  replaceGraph: (payload: { nodes: NetworkNode[]; links: NetworkLink[] }) => void;
};

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  links: [],
  setNodes: (updater) =>
    set((state) => ({
      nodes: resolveUpdater(updater, state.nodes),
    })),
  setLinks: (updater) =>
    set((state) => ({
      links: resolveUpdater(updater, state.links),
    })),
  replaceGraph: ({ nodes, links }) =>
    set({
      nodes: nodes.map((node) => ({ ...node })),
      links: links.map((link) => ({ ...link })),
    }),
}));
