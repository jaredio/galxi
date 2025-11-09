import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { getGroupIcon } from '../constants/groupIcons';
import { groupTypeLabelMap } from '../constants/groupLabels';
import { getNodeIcon } from '../constants/nodeIcons';
import { nodeTypeLabelMap } from '../constants/nodeTypeLabels';
import type { NodeTypeCategory } from '../constants/nodeOptions';
import { nodeTypeCategoryLabels, nodeTypeCategoryOrder, nodeTypeOptions } from '../constants/nodeOptions';
import { buildGroupProfileContent, buildNodeProfileContent } from '../lib/profileData';
import type { DashboardData } from '../lib/dashboardData';
import type { CanvasGroup, GroupLink, GroupType, NetworkLink, NetworkNode, NodeType } from '../types/graph';
import type { ProfileField, ProfileSection, ProfileWindowContent } from '../types/profile';

import { EyeIcon } from './icons';

export type DashboardEntity =
  | {
      kind: 'node';
      id: string;
    }
  | {
      kind: 'group';
      id: string;
    };

type DashboardPageProps = {
  data: DashboardData;
  nodes: NetworkNode[];
  groups: CanvasGroup[];
  links: NetworkLink[];
  groupLinks: GroupLink[];
  onFocusOnCanvas: (entity: DashboardEntity) => void;
  profileContext: {
    nodes: NetworkNode[];
    groups: CanvasGroup[];
    links: NetworkLink[];
    groupLinks: GroupLink[];
  };
};

type GroupTreeNode = {
  group: CanvasGroup;
  children: GroupTreeNode[];
  nodes: NetworkNode[];
};

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

type NodeInsight = {
  kind: 'node';
  resource: NetworkNode;
  profile: ProfileWindowContent;
  statusLabel: string;
  tone: StatusTone;
  group?: CanvasGroup;
  inbound: Array<{ id: string; label: string; relation: string }>;
  outbound: Array<{ id: string; label: string; relation: string }>;
  peers: NetworkNode[];
};

type GroupInsight = {
  kind: 'group';
  resource: CanvasGroup;
  profile: ProfileWindowContent;
  statusLabel: string;
  tone: StatusTone;
  parent?: CanvasGroup;
  childNodes: NetworkNode[];
  childGroups: CanvasGroup[];
  inbound: Array<{ id: string; label: string; relation: string }>;
  outbound: Array<{ id: string; label: string; relation: string }>;
};

type RelationshipInsight = NodeInsight | GroupInsight;

const orderedGroupTypes: GroupType[] = ['virtualNetwork', 'subnet', 'logicalGroup'];

const formatPercent = (value: number, total: number) => {
  if (total === 0) {
    return '0%';
  }
  return `${Math.round((value / total) * 100)}%`;
};

const toTitleCase = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatNodeTypeLabel = (type: NodeType) => nodeTypeLabelMap[type] ?? toTitleCase(type);

const getStatusLabel = (value?: string) => (value?.trim().length ? value.trim() : 'Unknown');

const normalizeStatusValue = (value?: string) => value?.trim().toLowerCase() ?? '';

const ACTIVE_STATES = new Set([
  'running',
  'active',
  'online',
  'available',
  'connected',
  'healthy',
  'ready',
  'up',
  'enabled',
]);

const INACTIVE_STATES = new Set([
  'stopped',
  'offline',
  'disconnected',
  'failed',
  'error',
  'inactive',
  'down',
  'disabled',
  'deallocated',
]);

const resolveStatusTone = (status: string): StatusTone => {
  const normalized = status.trim().toLowerCase();
  if (
    ['running', 'online', 'active', 'available', 'healthy', 'ready', 'connected'].some((token) =>
      normalized.includes(token)
    )
  ) {
    return 'success';
  }
  if (['degraded', 'pending', 'initializing', 'warming'].some((token) => normalized.includes(token))) {
    return 'warning';
  }
  if (['failed', 'error', 'offline', 'stopped', 'down', 'blocked'].some((token) => normalized.includes(token))) {
    return 'danger';
  }
  return 'neutral';
};

const mapProfileToneToStatusTone = (
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
): StatusTone => {
  if (tone === 'success' || tone === 'warning' || tone === 'danger') {
    return tone;
  }
  return 'neutral';
};

const formatFieldValue = (value?: string) => (value?.trim().length ? value : 'Not set');

const DashboardFieldList = ({ fields }: { fields: ProfileField[] }) => (
  <ul className="dashboard-field-list">
    {fields.map((field) => (
      <li key={field.id}>
        <div className="dashboard-field-heading">
          <p className="dashboard-field-label">{field.label}</p>
          {field.badge && <span className="dashboard-field-badge">{field.badge}</span>}
        </div>
        <p className={`dashboard-field-value${field.value?.trim() ? '' : ' is-empty'}`}>
          {formatFieldValue(field.value)}
        </p>
        {field.subtitle && <p className="dashboard-field-subtitle">{field.subtitle}</p>}
      </li>
    ))}
  </ul>
);

const DashboardFieldCards = ({ fields }: { fields: ProfileField[] }) => (
  <div className="dashboard-field-card-grid">
    {fields.map((field) => (
      <div key={field.id} className="dashboard-field-card">
        <div className="dashboard-field-card-head">
          {field.iconSrc && <img src={field.iconSrc} alt="" aria-hidden="true" />}
          <div>
            <p className="dashboard-field-label">{field.label}</p>
            {field.subtitle && <p className="dashboard-field-subtitle">{field.subtitle}</p>}
          </div>
          {field.badge && <span className="dashboard-field-badge">{field.badge}</span>}
        </div>
        <p className={`dashboard-field-value${field.value?.trim() ? '' : ' is-empty'}`}>
          {formatFieldValue(field.value)}
        </p>
      </div>
    ))}
  </div>
);

const DashboardProfileSectionCard = ({ section }: { section: ProfileSection }) => {
  const hasItems = section.items.length > 0;
  return (
    <article className="dashboard-profile-card">
      <header className="dashboard-profile-card-header">
        <p className="dashboard-card-label">{section.title}</p>
      </header>
      {hasItems ? (
        section.variant === 'cards' ? (
          <DashboardFieldCards fields={section.items} />
        ) : (
          <DashboardFieldList fields={section.items} />
        )
      ) : (
        <p className="dashboard-empty">No data captured yet.</p>
      )}
    </article>
  );
};

export const DashboardPage = ({
  data,
  nodes,
  groups,
  links,
  groupLinks,
  onFocusOnCanvas,
  profileContext,
}: DashboardPageProps) => {
  const [selection, setSelection] = useState<DashboardEntity | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [categoryFilter, setCategoryFilter] = useState<NodeTypeCategory | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<NodeType | 'all'>('all');
  const [nodeSearch, setNodeSearch] = useState('');

  const nodeLookup = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const groupLookup = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);
  const nodeCategoryMap = useMemo(
    () => new Map(nodeTypeOptions.map((option) => [option.value, option.category] as const)),
    []
  );
  const typeFilterOptions = useMemo(
    () => (categoryFilter === 'all' ? nodeTypeOptions : nodeTypeOptions.filter((option) => option.category === categoryFilter)),
    [categoryFilter]
  );

  useEffect(() => {
    if (typeFilter === 'all' || categoryFilter === 'all') {
      return;
    }
    if (nodeCategoryMap.get(typeFilter) !== categoryFilter) {
      setTypeFilter('all');
    }
  }, [categoryFilter, typeFilter, nodeCategoryMap]);

  const filteredNodes = useMemo(() => {
    const search = nodeSearch.trim().toLowerCase();
    return nodes.filter((node) => {
      if (categoryFilter !== 'all' && nodeCategoryMap.get(node.type) !== categoryFilter) {
        return false;
      }
      if (typeFilter !== 'all' && node.type !== typeFilter) {
        return false;
      }
      if (!search) {
        return true;
      }
      const label = (node.label ?? '').toLowerCase();
      const typeLabel = nodeTypeLabelMap[node.type]?.toLowerCase() ?? '';
      const groupTitle = node.group ? groupLookup.get(node.group)?.title.toLowerCase() ?? '' : '';
      return (
        label.includes(search) ||
        typeLabel.includes(search) ||
        (!!groupTitle && groupTitle.includes(search))
      );
    });
  }, [nodes, categoryFilter, typeFilter, nodeSearch, nodeCategoryMap, groupLookup]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);
  const filteredLinks = useMemo(
    () => links.filter((link) => filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target)),
    [links, filteredNodeIds]
  );
  const visibleGroupIds = useMemo(() => {
    const ids = new Set<string>();
    const visit = (groupId: string | undefined) => {
      if (!groupId || ids.has(groupId)) {
        return;
      }
      ids.add(groupId);
      const parentId = groupLookup.get(groupId)?.parentGroupId;
      if (parentId) {
        visit(parentId);
      }
    };
    filteredNodes.forEach((node) => visit(node.group));
    return ids;
  }, [filteredNodes, groupLookup]);
  const filteredGroups = useMemo(
    () => groups.filter((group) => visibleGroupIds.has(group.id)),
    [groups, visibleGroupIds]
  );
  const filteredGroupIds = useMemo(() => new Set(filteredGroups.map((group) => group.id)), [filteredGroups]);
  const filteredGroupLinks = useMemo(
    () =>
      groupLinks.filter(
        (link) => filteredGroupIds.has(link.sourceGroupId) && filteredGroupIds.has(link.targetGroupId)
      ),
    [groupLinks, filteredGroupIds]
  );
  const filtersActive =
    categoryFilter !== 'all' || typeFilter !== 'all' || nodeSearch.trim().length > 0;

  useEffect(() => {
    setExpandedGroups((prev) => {
      let changed = false;
      const next: Record<string, boolean> = {};
      filteredGroups.forEach((group) => {
        const existing = prev[group.id];
        if (existing === undefined) {
          next[group.id] = !group.parentGroupId;
          changed = true;
        } else {
          next[group.id] = existing;
        }
      });
      if (Object.keys(prev).length !== Object.keys(next).length) {
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [filteredGroups]);

  useEffect(() => {
    if (selection) {
      const exists =
        (selection.kind === 'node' && filteredNodeIds.has(selection.id)) ||
        (selection.kind === 'group' && filteredGroupIds.has(selection.id));
      if (exists) {
        return;
      }
    }
    if (filteredNodes.length > 0) {
      setSelection({ kind: 'node', id: filteredNodes[0].id });
    } else if (filteredGroups.length > 0) {
      setSelection({ kind: 'group', id: filteredGroups[0].id });
    } else {
      setSelection(null);
    }
  }, [selection, filteredNodes, filteredGroups, filteredNodeIds, filteredGroupIds]);

  const nodeLinkMap = useMemo(() => {
    const map = new Map<string, { inbound: NetworkLink[]; outbound: NetworkLink[] }>();
    filteredNodes.forEach((node) => {
      map.set(node.id, { inbound: [], outbound: [] });
    });
    filteredLinks.forEach((link) => {
      if (!map.has(link.source)) {
        map.set(link.source, { inbound: [], outbound: [] });
      }
      if (!map.has(link.target)) {
        map.set(link.target, { inbound: [], outbound: [] });
      }
      map.get(link.source)!.outbound.push(link);
      map.get(link.target)!.inbound.push(link);
    });
    return map;
  }, [filteredNodes, filteredLinks]);

  const groupLinkMap = useMemo(() => {
    const map = new Map<string, { inbound: GroupLink[]; outbound: GroupLink[] }>();
    filteredGroups.forEach((group) => {
      map.set(group.id, { inbound: [], outbound: [] });
    });
    filteredGroupLinks.forEach((link) => {
      if (!map.has(link.sourceGroupId)) {
        map.set(link.sourceGroupId, { inbound: [], outbound: [] });
      }
      if (!map.has(link.targetGroupId)) {
        map.set(link.targetGroupId, { inbound: [], outbound: [] });
      }
      map.get(link.sourceGroupId)!.outbound.push(link);
      map.get(link.targetGroupId)!.inbound.push(link);
    });
    return map;
  }, [filteredGroups, filteredGroupLinks]);

  const nodesByGroupId = useMemo(() => {
    const map = new Map<string, NetworkNode[]>();
    filteredNodes.forEach((node) => {
      if (!node.group) {
        return;
      }
      const bucket = map.get(node.group) ?? [];
      bucket.push(node);
      map.set(node.group, bucket);
    });
    map.forEach((bucket) => bucket.sort((a, b) => a.label.localeCompare(b.label)));
    return map;
  }, [filteredNodes]);

  const childGroupsByParentId = useMemo(() => {
    const map = new Map<string, CanvasGroup[]>();
    filteredGroups.forEach((group) => {
      if (!group.parentGroupId) {
        return;
      }
      const bucket = map.get(group.parentGroupId) ?? [];
      bucket.push(group);
      map.set(group.parentGroupId, bucket);
    });
    map.forEach((bucket) => bucket.sort((a, b) => a.title.localeCompare(b.title)));
    return map;
  }, [filteredGroups]);

  const hierarchy = useMemo(() => {
    const map = new Map<string, GroupTreeNode>();
    filteredGroups.forEach((group) => {
      map.set(group.id, { group, children: [], nodes: [] });
    });
    filteredNodes.forEach((node) => {
      if (!node.group) {
        return;
      }
      const bucket = map.get(node.group);
      if (bucket) {
        bucket.nodes.push(node);
      }
    });
    filteredGroups.forEach((group) => {
      if (!group.parentGroupId) {
        return;
      }
      const parent = map.get(group.parentGroupId);
      const child = map.get(group.id);
      if (parent && child) {
        parent.children.push(child);
      }
    });
    const typeRank = (type: GroupType) => {
      const index = orderedGroupTypes.indexOf(type);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    const sortTree = (entries: GroupTreeNode[]) => {
      entries.sort((a, b) => {
        if (a.group.type === b.group.type) {
          return a.group.title.localeCompare(b.group.title);
        }
        return typeRank(a.group.type) - typeRank(b.group.type);
      });
      entries.forEach((entry) => {
        entry.nodes.sort((a, b) => a.label.localeCompare(b.label));
        if (entry.children.length > 0) {
          sortTree(entry.children);
        }
      });
    };
    const roots = Array.from(map.values()).filter((entry) => {
      const parentId = entry.group.parentGroupId;
      if (!parentId) {
        return true;
      }
      return !map.has(parentId);
    });
    sortTree(roots);
    const mappedGroupIds = new Set(filteredGroups.map((group) => group.id));
    const ungroupedNodes = filteredNodes
      .filter((node) => !node.group || !mappedGroupIds.has(node.group))
      .sort((a, b) => a.label.localeCompare(b.label));
    return { roots, ungroupedNodes };
  }, [filteredGroups, filteredNodes]);

  const selectedInsight = useMemo<RelationshipInsight | null>(() => {
    if (!selection) {
      return null;
    }
    if (selection.kind === 'node') {
      if (!filteredNodeIds.has(selection.id)) {
        return null;
      }
      const node = nodeLookup.get(selection.id);
      if (!node) {
        return null;
      }
      const profileContent = buildNodeProfileContent(node, profileContext);
      const statusLabel = profileContent.status?.label ?? getStatusLabel(node.profile?.['overview.status']);
      const tone = profileContent.status
        ? mapProfileToneToStatusTone(profileContent.status.tone)
        : resolveStatusTone(statusLabel);
      const bucket = nodeLinkMap.get(node.id) ?? { inbound: [], outbound: [] };
      const inbound = bucket.inbound.map((link) => {
        const neighbor = nodeLookup.get(link.source);
        return { id: link.source, label: neighbor?.label ?? link.source, relation: link.relation };
      });
      const outbound = bucket.outbound.map((link) => {
        const neighbor = nodeLookup.get(link.target);
        return { id: link.target, label: neighbor?.label ?? link.target, relation: link.relation };
      });
      const group = node.group ? groupLookup.get(node.group) : undefined;
      const peers = group ? (nodesByGroupId.get(group.id) ?? []).filter((peer) => peer.id !== node.id) : [];
      return {
        kind: 'node',
        resource: node,
        profile: profileContent,
        statusLabel,
        tone,
        group,
        inbound,
        outbound,
        peers,
      };
    }
    if (!filteredGroupIds.has(selection.id)) {
      return null;
    }
    const group = groupLookup.get(selection.id);
    if (!group) {
      return null;
    }
    const profileContent = buildGroupProfileContent(group, profileContext);
    const statusLabel = profileContent.status?.label ?? getStatusLabel(group.profile?.['overview.status']);
    const tone = profileContent.status
      ? mapProfileToneToStatusTone(profileContent.status.tone)
      : resolveStatusTone(statusLabel);
    const bucket = groupLinkMap.get(group.id) ?? { inbound: [], outbound: [] };
    const inbound = bucket.inbound.map((link) => {
      const source = groupLookup.get(link.sourceGroupId);
      return { id: link.sourceGroupId, label: source?.title ?? link.sourceGroupId, relation: link.relation };
    });
    const outbound = bucket.outbound.map((link) => {
      const target = groupLookup.get(link.targetGroupId);
      return { id: link.targetGroupId, label: target?.title ?? link.targetGroupId, relation: link.relation };
    });
    const childNodes = nodesByGroupId.get(group.id) ?? [];
    const childGroups = childGroupsByParentId.get(group.id) ?? [];
    const parent = group.parentGroupId ? groupLookup.get(group.parentGroupId) : undefined;
    return {
      kind: 'group',
      resource: group,
      profile: profileContent,
      statusLabel,
      tone,
      parent,
      childNodes,
      childGroups,
      inbound,
      outbound,
    };
  }, [
    selection,
    filteredNodeIds,
    filteredGroupIds,
    nodeLookup,
    nodeLinkMap,
    groupLookup,
    groupLinkMap,
    nodesByGroupId,
    childGroupsByParentId,
    profileContext,
  ]);

  const profileSections = useMemo(
    () => {
      if (!selectedInsight) {
        return { primary: [] as ProfileSection[], secondary: [] as ProfileSection[] };
      }
      const primary: ProfileSection[] = [];
      if (selectedInsight.profile.overview && selectedInsight.profile.overview.length > 0) {
        primary.push({
          id: 'overview',
          title: 'Overview',
          items: selectedInsight.profile.overview,
        });
      }
      primary.push(...selectedInsight.profile.sections);
      const secondary = selectedInsight.profile.connections ?? [];
      return { primary, secondary };
    },
    [selectedInsight]
  );

  const insightMetaEntries = useMemo(
    () => (selectedInsight?.profile.meta ?? []).filter((item) => item.value?.trim()),
    [selectedInsight]
  );

  let locationMetaLabel = 'Location';
  let locationMetaValue = 'Not set';
  if (selectedInsight) {
    const candidate = insightMetaEntries.find((item) => /region|location/i.test(item.label));
    const fallback =
      selectedInsight.kind === 'node'
        ? selectedInsight.resource.profile?.['overview.location'] ?? ''
        : selectedInsight.resource.profile?.['overview.region'] ?? '';
    locationMetaLabel = candidate?.label ?? (selectedInsight.kind === 'group' ? 'Region' : 'Location');
    locationMetaValue = candidate?.value?.trim() || fallback?.trim() || 'Not set';
  }

  const resourceMetaItems = selectedInsight
    ? [
        { label: 'Resource Type', value: selectedInsight.profile.typeLabel },
        { label: 'State', value: selectedInsight.statusLabel },
        { label: locationMetaLabel, value: locationMetaValue },
      ]
    : [];

  const overallTotals = data.totals;
  const filteredNodeTypeBreakdown = useMemo(() => {
    const counts = new Map<NodeType, number>();
    filteredNodes.forEach((node) => {
      counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredNodes]);
  const filteredGroupTypeBreakdown = useMemo(() => {
    const counts = new Map<GroupType, number>();
    filteredGroups.forEach((group) => {
      counts.set(group.type, (counts.get(group.type) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredGroups]);
  const filteredTotals = useMemo(() => {
    let activeNodes = 0;
    let inactiveNodes = 0;
    filteredNodes.forEach((node) => {
      const status = normalizeStatusValue(node.profile?.['overview.status']);
      if (ACTIVE_STATES.has(status)) {
        activeNodes += 1;
      } else if (INACTIVE_STATES.has(status)) {
        inactiveNodes += 1;
      }
    });
    return {
      nodes: filteredNodes.length,
      groups: filteredGroups.length,
      connections: filteredLinks.length + filteredGroupLinks.length,
      nodeLinks: filteredLinks.length,
      groupLinks: filteredGroupLinks.length,
      activeNodes,
      inactiveNodes,
      unknownNodes: Math.max(filteredNodes.length - activeNodes - inactiveNodes, 0),
    };
  }, [filteredNodes, filteredGroups, filteredLinks, filteredGroupLinks]);
  const summaryRows = filteredNodeTypeBreakdown.filter((row) => row.count > 0);
  const healthTotal = filteredTotals.activeNodes + filteredTotals.inactiveNodes + filteredTotals.unknownNodes;
  const groupBreakdown = orderedGroupTypes.map((type) => ({
    type,
    label: groupTypeLabelMap[type],
    count: filteredGroupTypeBreakdown.find((entry) => entry.type === type)?.count ?? 0,
  }));
  const virtualNetworkCount = useMemo(
    () => filteredGroups.filter((group) => group.type === 'virtualNetwork').length,
    [filteredGroups]
  );
  const subnetCount = useMemo(
    () => filteredGroups.filter((group) => group.type === 'subnet').length,
    [filteredGroups]
  );
  const categoryCoverage = useMemo(() => {
    const map = new Map<NodeTypeCategory, number>();
    filteredNodes.forEach((node) => {
      const category = nodeCategoryMap.get(node.type);
      if (!category) {
        return;
      }
      map.set(category, (map.get(category) ?? 0) + 1);
    });
    return map;
  }, [filteredNodes, nodeCategoryMap]);
  const topNodeTypes = filteredNodeTypeBreakdown.slice(0, 4);
  const avgLinksPerNode =
    filteredTotals.nodes === 0 ? 0 : (filteredTotals.nodeLinks * 2) / filteredTotals.nodes;
  const formattedAvgLinks = avgLinksPerNode.toFixed(1);

  const handleResetFilters = () => {
    setCategoryFilter('all');
    setTypeFilter('all');
    setNodeSearch('');
  };

  const handleSummaryTypeSelect = (type: NodeType) => {
    const candidate = filteredNodes.find((node) => node.type === type);
    if (candidate) {
      setSelection({ kind: 'node', id: candidate.id });
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !(prev[groupId] ?? false),
    }));
  };

  const renderNodeRow = (node: NetworkNode) => {
    const bucket = nodeLinkMap.get(node.id);
    const connectionCount = (bucket?.inbound.length ?? 0) + (bucket?.outbound.length ?? 0);
    const status = getStatusLabel(node.profile?.['overview.status']);
    const tone = resolveStatusTone(status);
    const isSelected = selection?.kind === 'node' && selection.id === node.id;
    return (
      <div key={node.id} className={`dashboard-tree-leaf${isSelected ? ' is-selected' : ''}`}>
        <button
          type="button"
          className="dashboard-tree-main"
          onClick={() => setSelection({ kind: 'node', id: node.id })}
          onDoubleClick={() => onFocusOnCanvas({ kind: 'node', id: node.id })}
        >
          <img src={getNodeIcon(node.type)} alt="" className="dashboard-tree-icon" />
          <div className="dashboard-tree-copy">
            <span className="dashboard-tree-title">{node.label}</span>
            <span className="dashboard-tree-subtitle">{formatNodeTypeLabel(node.type)}</span>
          </div>
          <span className={`dashboard-pill dashboard-pill--${tone}`}>{status}</span>
          <span className="dashboard-count-chip">{connectionCount} links</span>
        </button>
        <button
          type="button"
          className="dashboard-tree-focus"
          aria-label={`Focus ${node.label} on canvas`}
          onClick={() => onFocusOnCanvas({ kind: 'node', id: node.id })}
        >
          <EyeIcon className="dashboard-tree-eye" />
        </button>
      </div>
    );
  };

  const renderGroupNode = (entry: GroupTreeNode): ReactElement => {
    const {
      group,
      nodes: groupNodes,
      children,
    } = entry;
    const isExpanded = expandedGroups[group.id] ?? false;
    const isSelected = selection?.kind === 'group' && selection.id === group.id;
    const bucket = groupLinkMap.get(group.id);
    const connectionCount = (bucket?.inbound.length ?? 0) + (bucket?.outbound.length ?? 0);
    const hasChildren = groupNodes.length > 0 || children.length > 0;
    return (
      <div key={group.id} className="dashboard-tree-branch">
        <div className={`dashboard-tree-item${isSelected ? ' is-selected' : ''}`}>
          <button
            type="button"
            className={`dashboard-tree-expand${!hasChildren ? ' dashboard-tree-expand--disabled' : ''}`}
            aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
            onClick={() => hasChildren && toggleGroup(group.id)}
            disabled={!hasChildren}
          >
            <span className={`dashboard-chevron${isExpanded ? ' expanded' : ''}`} />
          </button>
          <button
            type="button"
            className="dashboard-tree-main"
            onClick={() => setSelection({ kind: 'group', id: group.id })}
            onDoubleClick={() => onFocusOnCanvas({ kind: 'group', id: group.id })}
          >
            <img src={getGroupIcon(group.type)} alt="" className="dashboard-tree-icon" />
            <div className="dashboard-tree-copy">
              <span className="dashboard-tree-title">{group.title}</span>
              <span className="dashboard-tree-subtitle">{groupTypeLabelMap[group.type]}</span>
            </div>
            <div className="dashboard-tree-meta">
              <span className="dashboard-count-chip">{groupNodes.length} nodes</span>
              <span className="dashboard-count-chip">{children.length} groups</span>
              <span className="dashboard-count-chip">{connectionCount} links</span>
            </div>
          </button>
          <button
            type="button"
            className="dashboard-tree-focus"
            aria-label={`Focus ${group.title} on canvas`}
            onClick={() => onFocusOnCanvas({ kind: 'group', id: group.id })}
          >
            <EyeIcon className="dashboard-tree-eye" />
          </button>
        </div>
        {hasChildren && isExpanded && (
          <div className="dashboard-tree-children">
            {groupNodes.map((node) => renderNodeRow(node))}
            {children.map((child) => renderGroupNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="dashboard-shell view-fade" aria-label="Galxi dashboard overview">
      <section className="dashboard-panel dashboard-summary-panel">
        <header className="dashboard-panel-header">
          <h1 className="dashboard-panel-title">Deployment Overview</h1>
        </header>

        <div className="dashboard-summary-cards">
          <article className="dashboard-summary-card">
            <p className="dashboard-card-label">Resources in Scope</p>
            <p className="dashboard-metric-value">{filteredTotals.nodes}</p>
            <p className="dashboard-card-subtitle">
              {filtersActive
                ? `${filteredTotals.nodes} of ${overallTotals.nodes} total`
                : 'Entire catalog'}
            </p>
          </article>
          <article className="dashboard-summary-card">
            <p className="dashboard-card-label">Network Scopes</p>
            <p className="dashboard-metric-value">{filteredTotals.groups}</p>
            <p className="dashboard-card-subtitle">
              {virtualNetworkCount} vNets / {subnetCount} subnets
            </p>
          </article>
          <article className="dashboard-summary-card">
            <p className="dashboard-card-label">Link Density</p>
            <p className="dashboard-metric-value">{formattedAvgLinks}</p>
            <p className="dashboard-card-subtitle">
              {filteredTotals.nodeLinks} node / {filteredTotals.groupLinks} group links
            </p>
          </article>
        </div>

        <div className="dashboard-summary-supplement">
          <article className="dashboard-health-card">
            <div className="dashboard-health-header">
              <p className="dashboard-card-label">Health & Availability</p>
              <p className="dashboard-health-total">{healthTotal} resources tracked</p>
            </div>
            <div className="dashboard-health-bar" aria-hidden="true">
              <span
                className="dashboard-health-segment dashboard-health-segment--active"
                style={{
                  width: `${healthTotal === 0 ? 0 : (filteredTotals.activeNodes / healthTotal) * 100}%`,
                }}
              />
              <span
                className="dashboard-health-segment dashboard-health-segment--inactive"
                style={{
                  width: `${healthTotal === 0 ? 0 : (filteredTotals.inactiveNodes / healthTotal) * 100}%`,
                }}
              />
              <span
                className="dashboard-health-segment dashboard-health-segment--unknown"
                style={{
                  width: `${healthTotal === 0 ? 0 : (filteredTotals.unknownNodes / healthTotal) * 100}%`,
                }}
              />
            </div>
            <ul className="dashboard-health-legend">
              <li>
                <span className="legend-dot legend-dot--active" />
                Active&nbsp;{filteredTotals.activeNodes}
              </li>
              <li>
                <span className="legend-dot legend-dot--inactive" />
                Inactive&nbsp;{filteredTotals.inactiveNodes}
              </li>
              <li>
                <span className="legend-dot legend-dot--unknown" />
                Unknown&nbsp;{filteredTotals.unknownNodes}
              </li>
            </ul>
          </article>

          <article className="dashboard-groups-card">
            <p className="dashboard-card-label">Network Distribution</p>
            <ul className="dashboard-group-breakdown">
              {groupBreakdown.map((entry) => (
                <li key={entry.type}>
                  <div className="dashboard-group-row">
                    <span>{entry.label}</span>
                    <span className="dashboard-group-count">
                      {entry.count} ({formatPercent(entry.count, filteredTotals.groups)})
                    </span>
                  </div>
                  <div className="dashboard-group-bar">
                    <span
                      className="dashboard-group-fill"
                      style={{
                        width: formatPercent(entry.count, filteredTotals.groups),
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="dashboard-groups-card">
            <p className="dashboard-card-label">Category Coverage</p>
            {categoryCoverage.size === 0 ? (
              <p className="dashboard-empty">No resources in scope.</p>
            ) : (
              <div className="dashboard-category-chip-grid">
                {nodeTypeCategoryOrder
                  .filter((category) => categoryCoverage.has(category))
                  .map((category) => {
                    const count = categoryCoverage.get(category)!;
                    return (
                      <span key={category} className="dashboard-category-chip">
                        <span className="dashboard-category-chip-label">
                          {nodeTypeCategoryLabels[category]}
                        </span>
                        <span className="dashboard-category-chip-value">{count}</span>
                      </span>
                    );
                  })}
              </div>
            )}
          </article>

          <article className="dashboard-groups-card">
            <p className="dashboard-card-label">Link Topology</p>
            <div className="dashboard-link-split">
              <div>
                <p className="dashboard-link-label">Node links</p>
                <p className="dashboard-link-value">{filteredTotals.nodeLinks}</p>
              </div>
              <div>
                <p className="dashboard-link-label">Group links</p>
                <p className="dashboard-link-value">{filteredTotals.groupLinks}</p>
              </div>
            </div>
          </article>

          <article className="dashboard-groups-card">
            <p className="dashboard-card-label">Top Resource Types</p>
            {topNodeTypes.length === 0 ? (
              <p className="dashboard-empty">No resources match the current filters.</p>
            ) : (
              <ul className="dashboard-top-type-list">
                {topNodeTypes.map((entry) => (
                  <li key={entry.type}>
                    <span>{formatNodeTypeLabel(entry.type)}</span>
                    <span>
                      {entry.count} ({formatPercent(entry.count, filteredTotals.nodes)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        {summaryRows.length > 0 ? (
          <div className="dashboard-metric-table">
            <div className="dashboard-metric-table-header">
              <p className="dashboard-card-label">Resource Inventory</p>
              <p className="dashboard-card-subtitle">
                Tap any row to inspect that workload inside the hierarchy.
              </p>
            </div>
            <table>
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  <th scope="col">Count</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={row.type} onClick={() => handleSummaryTypeSelect(row.type)}>
                    <td>{formatNodeTypeLabel(row.type)}</td>
                    <td>{row.count}</td>
                    <td>{formatPercent(row.count, filteredTotals.nodes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard-metric-table">
            <div className="dashboard-metric-table-header">
              <p className="dashboard-card-label">Resource Inventory</p>
            </div>
            <p className="dashboard-empty">No resources match the current filters.</p>
          </div>
        )}
      </section>

      <div className="dashboard-filter-bar">
        <label className="dashboard-filter-field">
          <span>Quick Search</span>
          <input
            type="search"
            value={nodeSearch}
            onChange={(event) => setNodeSearch(event.target.value)}
            placeholder="Label, type, or group"
          />
        </label>
        <label className="dashboard-filter-field">
          <span>Category</span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as NodeTypeCategory | 'all')}
          >
            <option value="all">All categories</option>
            {nodeTypeCategoryOrder
              .filter((category) =>
                nodeTypeOptions.some((option) => option.category === category)
              )
              .map((category) => (
                <option key={category} value={category}>
                  {nodeTypeCategoryLabels[category]}
                </option>
              ))}
          </select>
        </label>
        <label className="dashboard-filter-field">
          <span>Resource Type</span>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as NodeType | 'all')}
          >
            <option value="all">All resource types</option>
            {typeFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="dashboard-filter-actions">
          <p className="dashboard-filter-hint">
            {filtersActive
              ? `Showing ${filteredTotals.nodes} of ${overallTotals.nodes} resources`
              : 'All resources visible'}
          </p>
          {filtersActive && (
            <button type="button" className="dashboard-filter-reset" onClick={handleResetFilters}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel dashboard-panel--hierarchy">
          <header className="dashboard-panel-header">
            <h2 className="dashboard-panel-title">Resource Hierarchy</h2>
          </header>

          <div className="dashboard-panel-body">
            {hierarchy.roots.map((root) => renderGroupNode(root))}
            {hierarchy.ungroupedNodes.length > 0 && (
              <div className="dashboard-tree-section">
                <p className="dashboard-section-label">Ungrouped Resources</p>
                {hierarchy.ungroupedNodes.map((node) => renderNodeRow(node))}
              </div>
            )}
            {hierarchy.roots.length === 0 && hierarchy.ungroupedNodes.length === 0 && (
              <p className="dashboard-empty">No topology data is available yet.</p>
            )}
          </div>
        </section>

        <section className="dashboard-panel dashboard-panel--insights">
          <header className="dashboard-panel-header">
            <h2 className="dashboard-panel-title">Resource Context</h2>
          </header>

          <div className="dashboard-panel-body dashboard-panel-body--insights">
            {selectedInsight ? (
              <>
                <div className="dashboard-insight-header">
                  <div>
                    <p className="dashboard-section-label">{selectedInsight.profile.typeLabel}</p>
                    <h3 className="dashboard-insight-title">{selectedInsight.profile.title}</h3>
                  </div>
                  <div className="dashboard-insight-meta">
                    <span className={`dashboard-pill dashboard-pill--${selectedInsight.tone}`}>
                      {selectedInsight.statusLabel}
                    </span>
                    <button
                      type="button"
                      className="dashboard-focus-action"
                      onClick={() => selection && onFocusOnCanvas(selection)}
                    >
                      <EyeIcon className="dashboard-tree-eye" />
                      Focus on Canvas
                    </button>
                  </div>
                </div>
                <>
                  <div className="dashboard-resource-meta">
                    {resourceMetaItems.map((item) => (
                      <div key={`${item.label}-${item.value}`}>
                        <p className="dashboard-meta-label">{item.label}</p>
                        <p className="dashboard-meta-value">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {insightMetaEntries.length > 0 && (
                    <div className="dashboard-tag-grid">
                      {insightMetaEntries.map((item) => (
                        <span key={`${item.label}-${item.value}`} className="dashboard-tag">
                          {item.label}: {item.value}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="dashboard-insight-grid">
                    <article className="dashboard-insight-card">
                      <p className="dashboard-card-label">Resource Relationships</p>
                          {selectedInsight.inbound.length + selectedInsight.outbound.length === 0 ? (
                            <p className="dashboard-empty">No recorded links yet.</p>
                          ) : (
                            <ul className="dashboard-relationship-list">
                              {selectedInsight.inbound.map((item) => (
                                <li key={`in-${item.id}-${item.relation}`}>
                                  <span className="relationship-direction relationship-direction--inbound">
                                    Inbound
                                  </span>
                                  <div>
                                    <p className="relationship-target">{item.label}</p>
                                    <p className="relationship-meta">{item.relation}</p>
                                  </div>
                                </li>
                              ))}
                              {selectedInsight.outbound.map((item) => (
                                <li key={`out-${item.id}-${item.relation}`}>
                                  <span className="relationship-direction relationship-direction--outbound">
                                    Outbound
                                  </span>
                                  <div>
                                    <p className="relationship-target">{item.label}</p>
                                    <p className="relationship-meta">{item.relation}</p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </article>

                        <article className="dashboard-insight-card">
                          <p className="dashboard-card-label">Membership Context</p>
                          {selectedInsight.kind === 'node' ? (
                            <>
                              {selectedInsight.group ? (
                                <>
                                  <p className="dashboard-group-context-title">
                                    {selectedInsight.group.title}
                                  </p>
                                  <p className="dashboard-group-context-meta">
                                    {groupTypeLabelMap[selectedInsight.group.type]}
                                  </p>
                                </>
                              ) : (
                                <p className="dashboard-card-subtitle">Ungrouped resource</p>
                              )}
                              {selectedInsight.peers.length > 0 ? (
                                <>
                                  <p className="dashboard-card-subtitle">Peers in this scope</p>
                                  <div className="dashboard-peer-grid">
                                    {selectedInsight.peers.map((peer) => (
                                      <button
                                        key={peer.id}
                                        type="button"
                                        className="dashboard-peer-chip"
                                        onClick={() => setSelection({ kind: 'node', id: peer.id })}
                                      >
                                        {peer.label}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <p className="dashboard-card-subtitle">No sibling resources here yet.</p>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="dashboard-composition-grid">
                                <div>
                                  <p className="dashboard-composition-value">
                                    {selectedInsight.childNodes.length}
                                  </p>
                                  <p className="dashboard-card-subtitle">Nodes</p>
                                </div>
                                <div>
                                  <p className="dashboard-composition-value">
                                    {selectedInsight.childGroups.length}
                                  </p>
                                  <p className="dashboard-card-subtitle">Subgroups</p>
                                </div>
                                <div>
                                  <p className="dashboard-composition-value">
                                    {selectedInsight.inbound.length}
                                  </p>
                                  <p className="dashboard-card-subtitle">Inbound</p>
                                </div>
                                <div>
                                  <p className="dashboard-composition-value">
                                    {selectedInsight.outbound.length}
                                  </p>
                                  <p className="dashboard-card-subtitle">Outbound</p>
                                </div>
                              </div>
                              {selectedInsight.parent ? (
                                <p className="dashboard-card-subtitle">
                                  Parent scope: {selectedInsight.parent.title} (
                                  {groupTypeLabelMap[selectedInsight.parent.type]})
                                </p>
                              ) : (
                                <p className="dashboard-card-subtitle">Top-level group</p>
                              )}
                            </>
                          )}
                        </article>

                  </div>
                  {profileSections.primary.length > 0 && (
                    <div className="dashboard-profile-section">
                      <p className="dashboard-section-label">Resource Details</p>
                      <div className="dashboard-profile-stack">
                        {profileSections.primary.map((section) => (
                          <DashboardProfileSectionCard key={section.id} section={section} />
                        ))}
                      </div>
                    </div>
                  )}
                  {profileSections.secondary.length > 0 && (
                    <div className="dashboard-profile-section">
                      <p className="dashboard-section-label">Context</p>
                      <div className="dashboard-profile-stack">
                        {profileSections.secondary.map((section) => (
                          <DashboardProfileSectionCard key={section.id} section={section} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              </>
            ) : (
              <p className="dashboard-empty">Select a node or group to inspect its relationships.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};
