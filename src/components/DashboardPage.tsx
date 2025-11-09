import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { getGroupIcon } from '../constants/groupIcons';
import { groupTypeLabelMap } from '../constants/groupLabels';
import { getNodeIcon } from '../constants/nodeIcons';
import { nodeTypeLabelMap } from '../constants/nodeTypeLabels';
import { buildGroupProfileContent, buildNodeProfileContent } from '../lib/profileData';
import type { DashboardData } from '../lib/dashboardData';
import type { CanvasGroup, GroupLink, GroupType, NetworkLink, NetworkNode, NodeType } from '../types/graph';
import type { ProfileField } from '../types/profile';

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
  title: string;
  typeLabel: string;
  status: string;
  tone: StatusTone;
  group?: CanvasGroup;
  inbound: Array<{ id: string; label: string; relation: string }>;
  outbound: Array<{ id: string; label: string; relation: string }>;
  peers: NetworkNode[];
  profileFields: Array<{ id: string; label: string; value: string }>;
  profileMeta?: Array<{ label: string; value: string }>;
};

type GroupInsight = {
  kind: 'group';
  resource: CanvasGroup;
  title: string;
  typeLabel: string;
  status: string;
  tone: StatusTone;
  parent?: CanvasGroup;
  childNodes: NetworkNode[];
  childGroups: CanvasGroup[];
  inbound: Array<{ id: string; label: string; relation: string }>;
  outbound: Array<{ id: string; label: string; relation: string }>;
  profileFields: Array<{ id: string; label: string; value: string }>;
  profileMeta?: Array<{ label: string; value: string }>;
};

type RelationshipInsight = NodeInsight | GroupInsight;

const trackedNodeTypes: NodeType[] = ['vm', 'firewall', 'storage', 'disk', 'database', 'gateway'];
const orderedGroupTypes: GroupType[] = ['virtualNetwork', 'subnet', 'logicalGroup'];
type NodeMetricRow = { type: NodeType; count: number; label?: string };

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

const mapOverviewFields = (fields: ProfileField[]) =>
  fields
    .map((field) => ({
      id: field.id,
      label: field.label,
      value: field.value?.trim() || '—',
    }))
    .slice(0, 6);

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

  const nodeLookup = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const groupLookup = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);
  const virtualNetworkCount = useMemo(
    () => groups.filter((group) => group.type === 'virtualNetwork').length,
    [groups]
  );
  const subnetCount = useMemo(() => groups.filter((group) => group.type === 'subnet').length, [groups]);

  useEffect(() => {
    setExpandedGroups((prev) => {
      let changed = false;
      const next: Record<string, boolean> = {};
      groups.forEach((group) => {
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
  }, [groups]);

  useEffect(() => {
    if (selection) {
      const exists =
        (selection.kind === 'node' && nodeLookup.has(selection.id)) ||
        (selection.kind === 'group' && groupLookup.has(selection.id));
      if (exists) {
        return;
      }
    }
    if (nodes.length > 0) {
      setSelection({ kind: 'node', id: nodes[0].id });
    } else if (groups.length > 0) {
      setSelection({ kind: 'group', id: groups[0].id });
    } else {
      setSelection(null);
    }
  }, [selection, nodes, groups, nodeLookup, groupLookup]);

  const nodeLinkMap = useMemo(() => {
    const map = new Map<string, { inbound: NetworkLink[]; outbound: NetworkLink[] }>();
    nodes.forEach((node) => {
      map.set(node.id, { inbound: [], outbound: [] });
    });
    links.forEach((link) => {
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
  }, [nodes, links]);

  const groupLinkMap = useMemo(() => {
    const map = new Map<string, { inbound: GroupLink[]; outbound: GroupLink[] }>();
    groups.forEach((group) => {
      map.set(group.id, { inbound: [], outbound: [] });
    });
    groupLinks.forEach((link) => {
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
  }, [groups, groupLinks]);

  const nodesByGroupId = useMemo(() => {
    const map = new Map<string, NetworkNode[]>();
    nodes.forEach((node) => {
      if (!node.group) {
        return;
      }
      const bucket = map.get(node.group) ?? [];
      bucket.push(node);
      map.set(node.group, bucket);
    });
    map.forEach((bucket) => bucket.sort((a, b) => a.label.localeCompare(b.label)));
    return map;
  }, [nodes]);

  const childGroupsByParentId = useMemo(() => {
    const map = new Map<string, CanvasGroup[]>();
    groups.forEach((group) => {
      if (!group.parentGroupId) {
        return;
      }
      const bucket = map.get(group.parentGroupId) ?? [];
      bucket.push(group);
      map.set(group.parentGroupId, bucket);
    });
    map.forEach((bucket) => bucket.sort((a, b) => a.title.localeCompare(b.title)));
    return map;
  }, [groups]);

  const hierarchy = useMemo(() => {
    const map = new Map<string, GroupTreeNode>();
    groups.forEach((group) => {
      map.set(group.id, { group, children: [], nodes: [] });
    });
    nodes.forEach((node) => {
      if (!node.group) {
        return;
      }
      const bucket = map.get(node.group);
      if (bucket) {
        bucket.nodes.push(node);
      }
    });
    groups.forEach((group) => {
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
    const mappedGroupIds = new Set(groups.map((group) => group.id));
    const ungroupedNodes = nodes
      .filter((node) => !node.group || !mappedGroupIds.has(node.group))
      .sort((a, b) => a.label.localeCompare(b.label));
    return { roots, ungroupedNodes };
  }, [groups, nodes]);

  const selectedInsight = useMemo<RelationshipInsight | null>(() => {
    if (!selection) {
      return null;
    }
    if (selection.kind === 'node') {
      const node = nodeLookup.get(selection.id);
      if (!node) {
        return null;
      }
      const profileContent = buildNodeProfileContent(node, profileContext);
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
      const status = getStatusLabel(node.profile?.['overview.status']);
      return {
        kind: 'node',
        resource: node,
        title: node.label,
        typeLabel: formatNodeTypeLabel(node.type),
        status,
        tone: resolveStatusTone(status),
        group,
        inbound,
        outbound,
        peers,
        profileFields: mapOverviewFields(profileContent.overview ?? []),
        profileMeta: profileContent.meta,
      };
    }
    const group = groupLookup.get(selection.id);
    if (!group) {
      return null;
    }
    const profileContent = buildGroupProfileContent(group, profileContext);
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
    const status = getStatusLabel(group.profile?.['overview.status']);
    return {
      kind: 'group',
      resource: group,
      title: group.title,
      typeLabel: groupTypeLabelMap[group.type],
      status,
      tone: resolveStatusTone(status),
      parent,
      childNodes,
      childGroups,
      inbound,
      outbound,
      profileFields: mapOverviewFields(profileContent.overview ?? []),
      profileMeta: profileContent.meta,
    };
  }, [
    selection,
    nodeLookup,
    nodeLinkMap,
    groupLookup,
    groupLinkMap,
    nodesByGroupId,
    childGroupsByParentId,
    profileContext,
  ]);

  const handleSummaryTypeSelect = (type: NodeType) => {
    const candidate = nodes.find((node) => node.type === type);
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

  const { totals, nodeTypeBreakdown, groupTypeBreakdown } = data;
  const nodeMetricRows: NodeMetricRow[] = [
    ...trackedNodeTypes.map((type) => ({
      type,
      label: formatNodeTypeLabel(type),
      count: nodeTypeBreakdown.find((row) => row.type === type)?.count ?? 0,
    })),
    ...nodeTypeBreakdown.filter((row) => !trackedNodeTypes.includes(row.type)),
  ].filter((row, index, array) => array.findIndex((entry) => entry.type === row.type) === index);

  const summaryRows = nodeMetricRows.filter((row) => row.count > 0);
  const healthTotal = totals.activeNodes + totals.inactiveNodes + totals.unknownNodes;
  const groupBreakdown = orderedGroupTypes.map((type) => ({
    type,
    label: groupTypeLabelMap[type],
    count: groupTypeBreakdown.find((entry) => entry.type === type)?.count ?? 0,
  }));

  return (
    <main className="dashboard-shell view-fade" aria-label="Galxi dashboard overview">
      <section className="dashboard-panel dashboard-summary-panel">
        <header className="dashboard-panel-header">
          <h1 className="dashboard-panel-title">Deployment Overview</h1>
        </header>

        <div className="dashboard-summary-cards">
          <article className="dashboard-summary-card">
            <p className="dashboard-card-label">Active Workloads</p>
            <p className="dashboard-metric-value">{totals.nodes}</p>
            <p className="dashboard-card-subtitle">Virtual machines and services</p>
          </article>
          <article className="dashboard-summary-card">
            <p className="dashboard-card-label">Virtual Networks & Subnets</p>
            <p className="dashboard-metric-value">{virtualNetworkCount + subnetCount}</p>
            <p className="dashboard-card-subtitle">
              {virtualNetworkCount} vNets / {subnetCount} subnets
            </p>
          </article>
          <article className="dashboard-summary-card">
            <p className="dashboard-card-label">Dependency Links</p>
            <p className="dashboard-metric-value">{totals.connections}</p>
            <p className="dashboard-card-subtitle">
              {totals.nodeLinks} node / {totals.groupLinks} group links
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
                style={{ width: `${healthTotal === 0 ? 0 : (totals.activeNodes / healthTotal) * 100}%` }}
              />
              <span
                className="dashboard-health-segment dashboard-health-segment--inactive"
                style={{
                  width: `${healthTotal === 0 ? 0 : (totals.inactiveNodes / healthTotal) * 100}%`,
                }}
              />
              <span
                className="dashboard-health-segment dashboard-health-segment--unknown"
                style={{
                  width: `${healthTotal === 0 ? 0 : (totals.unknownNodes / healthTotal) * 100}%`,
                }}
              />
            </div>
            <ul className="dashboard-health-legend">
              <li>
                <span className="legend-dot legend-dot--active" />
                Active&nbsp;{totals.activeNodes}
              </li>
              <li>
                <span className="legend-dot legend-dot--inactive" />
                Inactive&nbsp;{totals.inactiveNodes}
              </li>
              <li>
                <span className="legend-dot legend-dot--unknown" />
                Unknown&nbsp;{totals.unknownNodes}
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
                      {entry.count} ({formatPercent(entry.count, totals.groups)})
                    </span>
                  </div>
                  <div className="dashboard-group-bar">
                    <span
                      className="dashboard-group-fill"
                      style={{
                        width: formatPercent(entry.count, totals.groups),
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="dashboard-groups-card">
            <p className="dashboard-card-label">Link Topology</p>
            <div className="dashboard-link-split">
              <div>
                <p className="dashboard-link-label">Node links</p>
                <p className="dashboard-link-value">{totals.nodeLinks}</p>
              </div>
              <div>
                <p className="dashboard-link-label">Group links</p>
                <p className="dashboard-link-value">{totals.groupLinks}</p>
              </div>
            </div>
          </article>
        </div>

        {summaryRows.length > 0 && (
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
                    <td>{row.label ?? formatNodeTypeLabel(row.type)}</td>
                    <td>{row.count}</td>
                    <td>{formatPercent(row.count, totals.nodes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
                    <p className="dashboard-section-label">{selectedInsight.typeLabel}</p>
                    <h3 className="dashboard-insight-title">{selectedInsight.title}</h3>
                  </div>
                  <div className="dashboard-insight-meta">
                    <span className={`dashboard-pill dashboard-pill--${selectedInsight.tone}`}>
                      {selectedInsight.status}
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
                    <div>
                      <p className="dashboard-meta-label">Resource Type</p>
                      <p className="dashboard-meta-value">{selectedInsight.typeLabel}</p>
                    </div>
                    <div>
                      <p className="dashboard-meta-label">State</p>
                      <p className="dashboard-meta-value">{selectedInsight.status}</p>
                    </div>
                    <div>
                      <p className="dashboard-meta-label">Location</p>
                      <p className="dashboard-meta-value">
                        {selectedInsight.kind === 'node'
                          ? selectedInsight.resource.profile?.['overview.location'] || 'Unknown'
                          : selectedInsight.resource.profile?.['overview.region'] || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  {selectedInsight.profileMeta && selectedInsight.profileMeta.length > 0 && (
                    <div className="dashboard-tag-grid">
                      {selectedInsight.profileMeta.map((item) => (
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

                    <article className="dashboard-insight-card">
                      <p className="dashboard-card-label">Key Properties</p>
                      {selectedInsight.profileFields.length === 0 ? (
                        <p className="dashboard-empty">No profile properties captured yet.</p>
                      ) : (
                        <ul className="dashboard-key-properties">
                          {selectedInsight.profileFields.map((field) => (
                            <li key={field.id}>
                              <p className="dashboard-key-label">{field.label}</p>
                              <p className="dashboard-key-value">{field.value}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  </div>
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
