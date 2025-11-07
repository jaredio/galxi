import { getGroupIcon } from '../constants/groupIcons';
import { getNodeIcon } from '../constants/nodeIcons';
import { nodeTypeLabelMap } from '../constants/nodeTypeLabels';
import { groupTypeLabelMap } from '../constants/groupLabels';
import {
  createDefaultGroupProfile,
  createDefaultNodeProfile,
  getGroupProfileSchema,
  getMetaFromProfile,
  getNodeProfileSchema,
  getStatusFromProfile,
  mergeProfileWithSchema,
} from '../schemas/resources';
import { makeEdgeKey, makeGroupLinkKey } from './graph-utils';
import type { CanvasGroup, GroupLink, NetworkLink, NetworkNode } from '../types/graph';
import type { ProfileField, ProfileSection, ProfileWindowContent, ResourceProfileData } from '../types/profile';

type ProfileBuildContext = {
  nodes: NetworkNode[];
  groups: CanvasGroup[];
  links: NetworkLink[];
  groupLinks: GroupLink[];
};

const statusTone = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  const normalized = status.toLowerCase();
  if (['running', 'active', 'healthy', 'operational'].some((key) => normalized.includes(key))) {
    return 'success';
  }
  if (['stopped', 'disabled', 'warning', 'degraded'].some((key) => normalized.includes(key))) {
    return 'warning';
  }
  if (['error', 'failed', 'blocked'].some((key) => normalized.includes(key))) {
    return 'danger';
  }
  return 'neutral';
};

const buildSections = (
  schemaSections: Array<{
    id: string;
    title: string;
    fields: Array<{ id: string; label: string; editable?: boolean }>;
  }>,
  profile: ResourceProfileData
): {
  overview: ProfileField[];
  sections: ProfileSection[];
} => {
  const sections = schemaSections.map<ProfileSection>((section) => ({
    id: section.id,
    title: section.title,
    variant: 'default',
    items: section.fields.map((field) => ({
      id: `${section.id}.${field.id}`,
      label: field.label,
      value: profile[`${section.id}.${field.id}`] ?? '',
      editable: field.editable !== false,
    })),
  }));

  const [overviewSection, ...rest] = sections;
  return {
    overview: overviewSection?.items ?? [],
    sections: rest,
  };
};

const getGroupChain = (groupId: string | undefined, groups: CanvasGroup[]) => {
  const chain: CanvasGroup[] = [];
  if (!groupId) {
    return chain;
  }
  const visited = new Set<string>();
  let current = groups.find((group) => group.id === groupId);
  while (current && !visited.has(current.id)) {
    chain.push(current);
    visited.add(current.id);
    current = current.parentGroupId
      ? groups.find((candidate) => candidate.id === current?.parentGroupId)
      : undefined;
  }
  return chain;
};

const buildNodePlacementSection = (node: NetworkNode, context: ProfileBuildContext): ProfileSection | null => {
  const chain = getGroupChain(node.group, context.groups);
  if (chain.length === 0) {
    return null;
  }
  const ordered = [...chain].reverse();
  return {
    id: 'placement',
    title: 'Placement',
    variant: 'cards',
    items: ordered.map((group, index) => ({
      id: `placement-${group.id}`,
      label: group.title,
      value: groupTypeLabelMap[group.type] ?? 'Group',
      badge: index === ordered.length - 1 ? 'Direct' : 'Ancestor',
      iconSrc: getGroupIcon(group.type),
    })),
  };
};

const buildNodeConnectionsSection = (
  node: NetworkNode,
  context: ProfileBuildContext
): ProfileSection | null => {
  const connectionItems: ProfileField[] = context.links
    .filter((link) => link.source === node.id || link.target === node.id)
    .map((link) => {
      const peerId = link.source === node.id ? link.target : link.source;
      const peer = context.nodes.find((candidate) => candidate.id === peerId);
      const relation = link.relation || (peer ? nodeTypeLabelMap[peer.type] : 'Relation');
      return {
        id: `connection-${makeEdgeKey(link)}`,
        label: peer?.label ?? peerId,
        value: peer ? nodeTypeLabelMap[peer.type] : 'Resource',
        subtitle: relation,
        badge: link.source === node.id ? 'Outgoing' : 'Incoming',
        iconSrc: peer ? getNodeIcon(peer.type) : undefined,
      };
    });
  if (connectionItems.length === 0) {
    return null;
  }
  return {
    id: 'connections',
    title: 'Connections',
    variant: 'cards',
    items: connectionItems.slice(0, 6),
  };
};

const buildGroupPlacementSection = (
  group: CanvasGroup,
  context: ProfileBuildContext
): ProfileSection | null => {
  const chain = getGroupChain(group.parentGroupId, context.groups);
  if (chain.length === 0) {
    return null;
  }
  const ordered = [...chain].reverse();
  return {
    id: 'parent-chain',
    title: 'Parent Groups',
    variant: 'cards',
    items: ordered.map((ancestor, index) => ({
      id: `parent-${ancestor.id}`,
      label: ancestor.title,
      value: groupTypeLabelMap[ancestor.type] ?? 'Group',
      badge: index === ordered.length - 1 ? 'Direct' : 'Ancestor',
      iconSrc: getGroupIcon(ancestor.type),
    })),
  };
};

const buildGroupChildGroupsSection = (
  group: CanvasGroup,
  context: ProfileBuildContext
): ProfileSection | null => {
  const childGroups = context.groups.filter((candidate) => candidate.parentGroupId === group.id);
  if (childGroups.length === 0) {
    return null;
  }
  return {
    id: 'child-groups',
    title: 'Nested Groups',
    variant: 'cards',
    items: childGroups.map((child) => ({
      id: `child-${child.id}`,
      label: child.title,
      value: groupTypeLabelMap[child.type] ?? 'Group',
      badge: 'Contains',
      iconSrc: getGroupIcon(child.type),
    })),
  };
};

const buildGroupChildNodesSection = (
  group: CanvasGroup,
  context: ProfileBuildContext
): ProfileSection | null => {
  const memberNodes = context.nodes.filter((node) => node.group === group.id);
  if (memberNodes.length === 0) {
    return null;
  }
  return {
    id: 'member-nodes',
    title: 'Contained Resources',
    variant: 'cards',
    items: memberNodes.slice(0, 12).map((member) => ({
      id: `member-${member.id}`,
      label: member.label || member.id,
      value: nodeTypeLabelMap[member.type],
      subtitle: member.profile?.['overview.status'] ?? '',
      iconSrc: getNodeIcon(member.type),
      badge: 'Resource',
    })),
  };
};

const buildGroupConnectionsSection = (
  group: CanvasGroup,
  context: ProfileBuildContext
): ProfileSection | null => {
  const connectionItems: ProfileField[] = context.groupLinks
    .filter((link) => link.sourceGroupId === group.id || link.targetGroupId === group.id)
    .map((link) => {
      const peerId = link.sourceGroupId === group.id ? link.targetGroupId : link.sourceGroupId;
      const peer = context.groups.find((candidate) => candidate.id === peerId);
      return {
        id: `group-connection-${makeGroupLinkKey(link)}`,
        label: peer?.title ?? peerId,
        value: peer ? groupTypeLabelMap[peer.type] ?? 'Group' : 'Group',
        subtitle: link.relation || 'Linked group',
        badge: link.sourceGroupId === group.id ? 'Outgoing' : 'Incoming',
        iconSrc: peer ? getGroupIcon(peer.type) : undefined,
      };
    });
  if (connectionItems.length === 0) {
    return null;
  }
  return {
    id: 'group-connections',
    title: 'Group Connections',
    variant: 'cards',
    items: connectionItems,
  };
};

export const buildNodeProfileContent = (
  node: NetworkNode,
  context: ProfileBuildContext
): ProfileWindowContent => {
  const schema = getNodeProfileSchema(node.type);
  const profile = mergeProfileWithSchema(schema, node.profile ?? createDefaultNodeProfile(node.type));
  const { overview, sections } = buildSections(schema.sections, profile);
  const statusLabel = getStatusFromProfile(schema, profile);
  const meta = getMetaFromProfile(schema, profile);
  const connectionSections = [
    buildNodePlacementSection(node, context),
    buildNodeConnectionsSection(node, context),
  ].filter(Boolean) as ProfileSection[];

  return {
    title: node.label || nodeTypeLabelMap[node.type],
    typeLabel: nodeTypeLabelMap[node.type],
    iconSrc: getNodeIcon(node.type),
    overview,
    sections,
    connections: connectionSections,
    status: {
      label: statusLabel,
      tone: statusTone(statusLabel),
    },
    meta: meta.length > 0 ? meta : undefined,
  };
};

export const buildGroupProfileContent = (
  group: CanvasGroup,
  context: ProfileBuildContext
): ProfileWindowContent => {
  const schema = getGroupProfileSchema(group.type);
  const profile = mergeProfileWithSchema(schema, group.profile ?? createDefaultGroupProfile(group.type));
  const { overview, sections } = buildSections(schema.sections, profile);
  const statusLabel = getStatusFromProfile(schema, profile);
  const meta = getMetaFromProfile(schema, profile);
  const connectionSections = [
    buildGroupPlacementSection(group, context),
    buildGroupChildGroupsSection(group, context),
    buildGroupChildNodesSection(group, context),
    buildGroupConnectionsSection(group, context),
  ].filter(Boolean) as ProfileSection[];

  return {
    title: group.title,
    typeLabel: groupTypeLabelMap[group.type] ?? 'Group',
    iconSrc: getGroupIcon(group.type),
    overview,
    sections,
    connections: connectionSections,
    status: {
      label: statusLabel,
      tone: statusTone(statusLabel),
    },
    meta: meta.length > 0 ? meta : undefined,
  };
};
