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
import type { CanvasGroup, NetworkLink, NetworkNode } from '../types/graph';
import type { ProfileField, ProfileSection, ProfileWindowContent, ResourceProfileData } from '../types/profile';

type ProfileBuildContext = {
  nodes: NetworkNode[];
  groups: CanvasGroup[];
  links: NetworkLink[];
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

const formatList = (values: string[], emptyMessage = 'None') => {
  if (values.length === 0) {
    return emptyMessage;
  }
  const preview = values.slice(0, 3).join(', ');
  return values.length > 3 ? `${preview} +${values.length - 3} more` : preview;
};

const buildNodePlacementSection = (node: NetworkNode, context: ProfileBuildContext): ProfileSection | null => {
  const chain = getGroupChain(node.group, context.groups);
  if (chain.length === 0) {
    return null;
  }
  return {
    id: 'placement',
    title: 'Placement',
    items: chain.map((group) => ({
      id: `placement-${group.id}`,
      label: groupTypeLabelMap[group.type] ?? 'Group',
      value: group.title,
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
        id: `connection-${link.source}->${link.target}`,
        label: peer?.label ?? peerId,
        value: relation,
      };
    });
  if (connectionItems.length === 0) {
    return null;
  }
  return {
    id: 'connections',
    title: 'Connections',
    items: connectionItems.slice(0, 6),
  };
};

const buildGroupMembersSection = (
  group: CanvasGroup,
  context: ProfileBuildContext
): ProfileSection | null => {
  const childGroups = context.groups.filter((candidate) => candidate.parentGroupId === group.id);
  const memberNodes = context.nodes.filter((node) => node.group === group.id);
  if (childGroups.length === 0 && memberNodes.length === 0) {
    return null;
  }
  const items: ProfileField[] = [];
  if (childGroups.length > 0) {
    items.push({
      id: 'child-groups',
      label: 'Subgroups',
      value: formatList(
        childGroups.map((child) => `${groupTypeLabelMap[child.type] ?? 'Group'}: ${child.title}`)
      ),
    });
  }
  if (memberNodes.length > 0) {
    items.push({
      id: 'member-nodes',
      label: 'Resources',
      value: formatList(
        memberNodes.map((member) => `${member.label || member.id} (${nodeTypeLabelMap[member.type]})`)
      ),
    });
  }
  return {
    id: 'members',
    title: 'Contained Resources',
    items,
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
  return {
    id: 'parent-chain',
    title: 'Parent Groups',
    items: chain.map((ancestor) => ({
      id: `parent-${ancestor.id}`,
      label: groupTypeLabelMap[ancestor.type] ?? 'Group',
      value: ancestor.title,
    })),
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
  const supplementalSections = [
    buildNodePlacementSection(node, context),
    buildNodeConnectionsSection(node, context),
  ].filter(Boolean) as ProfileSection[];
  const enrichedSections = sections.concat(supplementalSections);

  return {
    title: node.label || nodeTypeLabelMap[node.type],
    typeLabel: nodeTypeLabelMap[node.type],
    iconSrc: getNodeIcon(node.type),
    overview,
    sections: enrichedSections,
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
  const supplementalSections = [
    buildGroupPlacementSection(group, context),
    buildGroupMembersSection(group, context),
  ].filter(Boolean) as ProfileSection[];
  const enrichedSections = sections.concat(supplementalSections);

  return {
    title: group.title,
    typeLabel: groupTypeLabelMap[group.type] ?? 'Group',
    iconSrc: getGroupIcon(group.type),
    overview,
    sections: enrichedSections,
    status: {
      label: statusLabel,
      tone: statusTone(statusLabel),
    },
    meta: meta.length > 0 ? meta : undefined,
  };
};
