import { create } from 'zustand';

import type { CanvasDrawing, CanvasGroup, GroupLink, NetworkLink, NetworkNode } from '../types/graph';
import {
  getGroupProfileSchema,
  getNodeProfileSchema,
  mergeProfileWithSchema,
} from '../schemas/resources';

type Updater<T> = T | ((current: T) => T);

const resolveUpdater = <T>(updater: Updater<T>, current: T): T =>
  typeof updater === 'function' ? (updater as (value: T) => T)(current) : updater;

type GraphStore = {
  nodes: NetworkNode[];
  links: NetworkLink[];
  groups: CanvasGroup[];
  groupLinks: GroupLink[];
  drawings: CanvasDrawing[];
  setNodes: (updater: Updater<NetworkNode[]>) => void;
  setLinks: (updater: Updater<NetworkLink[]>) => void;
  setGroups: (updater: Updater<CanvasGroup[]>) => void;
  setGroupLinks: (updater: Updater<GroupLink[]>) => void;
  setDrawings: (updater: Updater<CanvasDrawing[]>) => void;
  replaceGraph: (payload: {
    nodes: NetworkNode[];
    links: NetworkLink[];
    groups?: CanvasGroup[];
    groupLinks?: GroupLink[];
    drawings?: CanvasDrawing[];
  }) => void;
};

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  links: [],
  groups: [],
  groupLinks: [],
  drawings: [],
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
  setGroupLinks: (updater) =>
    set((state) => ({
      groupLinks: resolveUpdater(updater, state.groupLinks),
    })),
  setDrawings: (updater) =>
    set((state) => ({
      drawings: resolveUpdater(updater, state.drawings),
    })),
  replaceGraph: ({ nodes, links, groups, groupLinks, drawings }) =>
    set({
      nodes: nodes.map((node) => ({
        ...node,
        profile: mergeProfileWithSchema(getNodeProfileSchema(node.type), node.profile),
      })),
      links: links.map((link) => ({ ...link })),
      groups: groups
        ? groups.map((group) => ({
            ...group,
            profile: mergeProfileWithSchema(getGroupProfileSchema(group.type), group.profile),
          }))
        : [],
      groupLinks: groupLinks ? groupLinks.map((link) => ({ ...link })) : [],
      drawings: drawings ? drawings.map((drawing) => ({ ...drawing })) : [],
    }),
}));
