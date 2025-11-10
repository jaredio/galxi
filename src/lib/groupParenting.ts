import type { CanvasGroup, GroupType } from '../types/graph';

const GROUP_PARENT_RULES: Record<GroupType, GroupType[]> = {
  virtualNetwork: ['logicalGroup'],
  subnet: ['virtualNetwork', 'logicalGroup'],
  logicalGroup: ['logicalGroup'],
};

const GROUP_PARENT_PRIORITY: Record<GroupType, number> = {
  logicalGroup: 1,
  virtualNetwork: 2,
  subnet: 3,
};

const SPATIAL_CELL_SIZE = 320;

export const groupArea = (group: CanvasGroup) => group.width * group.height;

export const pointWithinGroup = (point: { x: number; y: number }, group: CanvasGroup) =>
  point.x >= group.x &&
  point.x <= group.x + group.width &&
  point.y >= group.y &&
  point.y <= group.y + group.height;

const groupContainsGroup = (child: CanvasGroup, parent: CanvasGroup) =>
  child.x >= parent.x &&
  child.y >= parent.y &&
  child.x + child.width <= parent.x + parent.width &&
  child.y + child.height <= parent.y + parent.height;

const cachedGroupArea = (group: CanvasGroup, cache: Map<string, number>) => {
  if (!cache.has(group.id)) {
    cache.set(group.id, groupArea(group));
  }
  return cache.get(group.id)!;
};

const sortParentTypesByPriority = (types: GroupType[]) =>
  [...types].sort((a, b) => (GROUP_PARENT_PRIORITY[b] ?? 0) - (GROUP_PARENT_PRIORITY[a] ?? 0));

const buildCandidateMapByType = (
  groups: CanvasGroup[],
  areaCache: Map<string, number>
): Map<GroupType, CanvasGroup[]> => {
  const map = new Map<GroupType, CanvasGroup[]>();
  groups.forEach((group) => {
    cachedGroupArea(group, areaCache);
    const list = map.get(group.type);
    if (list) {
      list.push(group);
    } else {
      map.set(group.type, [group]);
    }
  });
  map.forEach((list) => {
    list.sort((a, b) => cachedGroupArea(a, areaCache) - cachedGroupArea(b, areaCache));
  });
  return map;
};

type SpatialIndex = Map<GroupType, Map<string, CanvasGroup[]>>;

const toCellCoord = (value: number) => Math.floor(value / SPATIAL_CELL_SIZE);

const buildSpatialIndex = (groups: CanvasGroup[]): SpatialIndex => {
  const index: SpatialIndex = new Map();
  groups.forEach((group) => {
    const minX = toCellCoord(group.x);
    const maxX = toCellCoord(group.x + group.width);
    const minY = toCellCoord(group.y);
    const maxY = toCellCoord(group.y + group.height);
    let bucketsByType = index.get(group.type);
    if (!bucketsByType) {
      bucketsByType = new Map();
      index.set(group.type, bucketsByType);
    }
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const key = `${x}:${y}`;
        const bucket = bucketsByType.get(key);
        if (bucket) {
          bucket.push(group);
        } else {
          bucketsByType.set(key, [group]);
        }
      }
    }
  });
  return index;
};

const collectSpatialCandidateIds = (
  group: CanvasGroup,
  parentType: GroupType,
  spatialIndex: SpatialIndex
): Set<string> | null => {
  const bucketsByType = spatialIndex.get(parentType);
  if (!bucketsByType) {
    return null;
  }
  const minX = toCellCoord(group.x);
  const maxX = toCellCoord(group.x + group.width);
  const minY = toCellCoord(group.y);
  const maxY = toCellCoord(group.y + group.height);
  let found = false;
  const ids = new Set<string>();
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      const key = `${x}:${y}`;
      const bucket = bucketsByType.get(key);
      if (!bucket) {
        continue;
      }
      found = true;
      bucket.forEach((candidate) => ids.add(candidate.id));
    }
  }
  return found ? ids : null;
};

const determineGroupParentId = (
  group: CanvasGroup,
  candidatesByType: Map<GroupType, CanvasGroup[]>,
  spatialIndex: SpatialIndex,
  areaCache: Map<string, number>
) => {
  const allowedParents = GROUP_PARENT_RULES[group.type] ?? [];
  if (allowedParents.length === 0) {
    return undefined;
  }
  const sortedParentTypes = sortParentTypesByPriority(allowedParents);
  const childArea = cachedGroupArea(group, areaCache);
  for (const parentType of sortedParentTypes) {
    const candidates = candidatesByType.get(parentType);
    if (!candidates || candidates.length === 0) {
      continue;
    }
    const bucketFilter = collectSpatialCandidateIds(group, parentType, spatialIndex);
    for (const candidate of candidates) {
      if (bucketFilter && !bucketFilter.has(candidate.id)) {
        continue;
      }
      if (candidate.id === group.id) {
        continue;
      }
      if (cachedGroupArea(candidate, areaCache) < childArea) {
        continue;
      }
      if (groupContainsGroup(group, candidate)) {
        return candidate.id;
      }
    }
  }
  return undefined;
};

export const applyParentAssignments = (groups: CanvasGroup[]) => {
  if (groups.length <= 1) {
    return groups;
  }
  const areaCache = new Map<string, number>();
  const candidatesByType = buildCandidateMapByType(groups, areaCache);
  const spatialIndex = buildSpatialIndex(groups);
  let changed = false;
  const next = groups.map((group) => {
    const parentGroupId = determineGroupParentId(group, candidatesByType, spatialIndex, areaCache);
    if (group.parentGroupId === parentGroupId) {
      return group;
    }
    changed = true;
    return { ...group, parentGroupId };
  });
  return changed ? next : groups;
};

