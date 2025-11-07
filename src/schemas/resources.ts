import type { GroupType, NodeType } from '../types/graph';
import type { ResourceProfileData } from '../types/profile';

type ResourceFieldSchema = {
  id: string;
  label: string;
  defaultValue: string;
  editable?: boolean;
};

type ResourceSectionSchema = {
  id: string;
  title: string;
  fields: ResourceFieldSchema[];
};

type ResourceSchema = {
  sections: ResourceSectionSchema[];
  statusField?: string;
  metaFields?: Array<{ id: string; label: string }>;
};

const makeSections = (sections: ResourceSectionSchema[]): ResourceSectionSchema[] =>
  sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => ({ editable: true, ...field })),
  }));

const vmSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [{ id: 'overview.location', label: 'Region' }],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'size', label: 'Size', defaultValue: '' },
        { id: 'os', label: 'Operating System', defaultValue: '' },
        { id: 'location', label: 'Location', defaultValue: '' },
      ],
    },
    {
      id: 'network',
      title: 'Network',
      fields: [
        { id: 'subnet', label: 'Subnet', defaultValue: '' },
        { id: 'virtualNetwork', label: 'Virtual Network', defaultValue: '' },
        { id: 'privateIp', label: 'Private IP', defaultValue: '' },
        { id: 'publicIp', label: 'Public IP', defaultValue: '' },
      ],
    },
    {
      id: 'storage',
      title: 'Storage',
      fields: [
        { id: 'osDisk', label: 'OS Disk', defaultValue: '' },
        { id: 'dataDisks', label: 'Data Disks', defaultValue: '' },
        { id: 'storageType', label: 'Storage Type', defaultValue: '' },
      ],
    },
    {
      id: 'performance',
      title: 'Performance',
      fields: [
        { id: 'cpu', label: 'CPU', defaultValue: '' },
        { id: 'memory', label: 'Memory', defaultValue: '' },
        { id: 'network', label: 'Network', defaultValue: '' },
      ],
    },
  ]),
};

const firewallSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [{ id: 'overview.location', label: 'Region' }],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'location', label: 'Location', defaultValue: '' },
        { id: 'ruleset', label: 'Ruleset Version', defaultValue: '' },
      ],
    },
    {
      id: 'connections',
      title: 'Connections',
      fields: [
        { id: 'attachedVnets', label: 'Attached vNets', defaultValue: '' },
        { id: 'managedSubnets', label: 'Managed Subnets', defaultValue: '' },
        { id: 'protectedVms', label: 'Protected VMs', defaultValue: '' },
      ],
    },
    {
      id: 'security',
      title: 'Security',
      fields: [
        { id: 'threatDetection', label: 'Threat Detection', defaultValue: '' },
        { id: 'logging', label: 'Logging', defaultValue: '' },
        { id: 'lastPolicyUpdate', label: 'Last Policy Update', defaultValue: '' },
      ],
    },
  ]),
};

const storageSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.location', label: 'Region' },
    { id: 'overview.sku', label: 'SKU' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'tier', label: 'Access Tier', defaultValue: '' },
        { id: 'location', label: 'Location', defaultValue: '' },
      ],
    },
    {
      id: 'capacity',
      title: 'Capacity',
      fields: [
        { id: 'usedSpace', label: 'Used Space', defaultValue: '' },
        { id: 'totalObjects', label: 'Total Objects', defaultValue: '' },
        { id: 'throughput', label: 'Throughput', defaultValue: '' },
      ],
    },
    {
      id: 'connections',
      title: 'Connections',
      fields: [
        { id: 'linkedVms', label: 'Linked VMs', defaultValue: '' },
        { id: 'pipelines', label: 'Analytics Pipelines', defaultValue: '' },
        { id: 'encryption', label: 'Encryption', defaultValue: '' },
      ],
    },
  ]),
};

const virtualNetworkSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [{ id: 'overview.region', label: 'Region' }],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'addressSpace', label: 'Address Space', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'subnets', label: 'Subnets', defaultValue: '' },
      ],
    },
    {
      id: 'peering',
      title: 'Peering',
      fields: [
        { id: 'connectedVnets', label: 'Connected vNets', defaultValue: '' },
        { id: 'peeringStatus', label: 'Peering Status', defaultValue: '' },
      ],
    },
    {
      id: 'resources',
      title: 'Connected Resources',
      fields: [
        { id: 'vms', label: 'Virtual Machines', defaultValue: '' },
        { id: 'firewalls', label: 'Firewalls', defaultValue: '' },
        { id: 'storage', label: 'Storage Accounts', defaultValue: '' },
      ],
    },
  ]),
};

const subnetSchema: ResourceSchema = {
  statusField: 'overview.status',
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'addressRange', label: 'Address Range', defaultValue: '' },
        { id: 'parentVnet', label: 'Parent vNet', defaultValue: '' },
        { id: 'usage', label: 'Usage', defaultValue: '' },
      ],
    },
    {
      id: 'resources',
      title: 'Resources',
      fields: [
        { id: 'vms', label: 'VMs', defaultValue: '' },
        { id: 'firewalls', label: 'Firewalls', defaultValue: '' },
        { id: 'policies', label: 'Policies', defaultValue: '' },
      ],
    },
  ]),
};

const logicalGroupSchema: ResourceSchema = {
  statusField: 'overview.status',
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'owner', label: 'Owner', defaultValue: '' },
        { id: 'members', label: 'Member Count', defaultValue: '' },
        { id: 'lastAudit', label: 'Last Audit', defaultValue: '' },
      ],
    },
    {
      id: 'policies',
      title: 'Policies',
      fields: [
        { id: 'changeTracking', label: 'Change Tracking', defaultValue: '' },
        { id: 'deploymentLock', label: 'Deployment Lock', defaultValue: '' },
        { id: 'alerts', label: 'Alerts', defaultValue: '' },
      ],
    },
    {
      id: 'notes',
      title: 'Notes',
      fields: [{ id: 'description', label: 'Description', defaultValue: '' }],
    },
  ]),
};

const defaultNodeSchema: ResourceSchema = logicalGroupSchema;

const nodeSchemas: Record<NodeType, ResourceSchema> = {
  vm: vmSchema,
  firewall: firewallSchema,
  storage: storageSchema,
  database: storageSchema,
  gateway: firewallSchema,
  virtualNetwork: virtualNetworkSchema,
  subnet: subnetSchema,
  logicalGroup: logicalGroupSchema,
};

const groupSchemas: Record<GroupType, ResourceSchema> = {
  virtualNetwork: virtualNetworkSchema,
  subnet: subnetSchema,
  logicalGroup: logicalGroupSchema,
};

const createProfileFromSchema = (schema: ResourceSchema, seed?: ResourceProfileData): ResourceProfileData => {
  const profile: ResourceProfileData = {};
  schema.sections.forEach((section) => {
    section.fields.forEach((field) => {
      const key = `${section.id}.${field.id}`;
      profile[key] = seed?.[key] ?? field.defaultValue;
    });
  });
  return profile;
};

export const getNodeProfileSchema = (type: NodeType): ResourceSchema => nodeSchemas[type] ?? defaultNodeSchema;

export const getGroupProfileSchema = (type: GroupType): ResourceSchema => groupSchemas[type] ?? logicalGroupSchema;

export const createDefaultNodeProfile = (type: NodeType): ResourceProfileData =>
  createProfileFromSchema(getNodeProfileSchema(type));

export const createDefaultGroupProfile = (type: GroupType): ResourceProfileData =>
  createProfileFromSchema(getGroupProfileSchema(type));

export const mergeProfileWithSchema = (
  schema: ResourceSchema,
  profile?: ResourceProfileData
): ResourceProfileData => createProfileFromSchema(schema, profile);

export const getStatusFromProfile = (
  schema: ResourceSchema,
  profile: ResourceProfileData
): string => {
  const statusKey = schema.statusField ?? 'overview.status';
  return profile[statusKey] ?? 'Unknown';
};

export const getMetaFromProfile = (
  schema: ResourceSchema,
  profile: ResourceProfileData
): Array<{ label: string; value: string }> => {
  if (!schema.metaFields) {
    return [];
  }
  return schema.metaFields.map((meta) => ({
    label: meta.label,
    value: profile[meta.id] ?? '',
  }));
};
