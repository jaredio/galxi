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

const diskSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'configuration.tier', label: 'Performance Tier' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'size', label: 'Provisioned Size (GiB)', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'configuration',
      title: 'Configuration',
      fields: [
        { id: 'type', label: 'Disk Type', defaultValue: '' },
        { id: 'tier', label: 'Performance Tier', defaultValue: '' },
        { id: 'encryption', label: 'Encryption', defaultValue: '' },
        { id: 'replication', label: 'Replication', defaultValue: '' },
      ],
    },
    {
      id: 'attachments',
      title: 'Attachments',
      fields: [
        { id: 'attachedVm', label: 'Attached VM', defaultValue: '' },
        { id: 'lun', label: 'LUN', defaultValue: '' },
        { id: 'iops', label: 'IOPS Limit', defaultValue: '' },
        { id: 'throughput', label: 'Throughput Limit (MB/s)', defaultValue: '' },
      ],
    },
  ]),
};

const functionAppSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'settings.plan', label: 'App Service Plan' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'runtime', label: 'Runtime Stack', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'hostname', label: 'Default Hostname', defaultValue: '' },
      ],
    },
    {
      id: 'settings',
      title: 'Plan & Settings',
      fields: [
        { id: 'plan', label: 'App Service Plan', defaultValue: '' },
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'dailyQuota', label: 'Daily Execution Quota', defaultValue: '' },
        { id: 'alwaysOn', label: 'Always On', defaultValue: '' },
      ],
    },
    {
      id: 'endpoints',
      title: 'Endpoints',
      fields: [
        { id: 'publicUrl', label: 'Public URL', defaultValue: '' },
        { id: 'deploymentSlot', label: 'Deployment Slot', defaultValue: '' },
        { id: 'apiDefinition', label: 'OpenAPI Definition', defaultValue: '' },
      ],
    },
  ]),
};

const appServiceSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'plan.sku', label: 'SKU' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'stack', label: 'Runtime Stack', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'hostname', label: 'Default Hostname', defaultValue: '' },
      ],
    },
    {
      id: 'plan',
      title: 'App Service Plan',
      fields: [
        { id: 'name', label: 'Plan Name', defaultValue: '' },
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'capacity', label: 'Instance Capacity', defaultValue: '' },
        { id: 'zoneRedundant', label: 'Zone Redundant', defaultValue: '' },
      ],
    },
    {
      id: 'deployment',
      title: 'Deployment',
      fields: [
        { id: 'slot', label: 'Deployment Slot', defaultValue: '' },
        { id: 'latestBuild', label: 'Last Deployment', defaultValue: '' },
        { id: 'repo', label: 'Source', defaultValue: '' },
      ],
    },
  ]),
};

const vmScaleSetSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.instances', label: 'Instances' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'orchestration', label: 'Orchestration Mode', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'instances', label: 'Instances', defaultValue: '' },
      ],
    },
    {
      id: 'scaling',
      title: 'Scaling',
      fields: [
        { id: 'capacity', label: 'Capacity', defaultValue: '' },
        { id: 'autoscale', label: 'Autoscale Profile', defaultValue: '' },
        { id: 'min', label: 'Min Instances', defaultValue: '' },
        { id: 'max', label: 'Max Instances', defaultValue: '' },
      ],
    },
    {
      id: 'compute',
      title: 'Compute Profile',
      fields: [
        { id: 'vmSize', label: 'VM Size', defaultValue: '' },
        { id: 'osType', label: 'OS Type', defaultValue: '' },
        { id: 'image', label: 'Image Reference', defaultValue: '' },
        { id: 'upgradePolicy', label: 'Upgrade Policy', defaultValue: '' },
      ],
    },
    {
      id: 'networking',
      title: 'Networking',
      fields: [
        { id: 'subnet', label: 'Subnet', defaultValue: '' },
        { id: 'loadBalancer', label: 'Load Balancer', defaultValue: '' },
        { id: 'healthProbe', label: 'Health Probe', defaultValue: '' },
      ],
    },
  ]),
};

const loadBalancerSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'configuration.sku', label: 'SKU' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'type', label: 'Type', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'frontendIps', label: 'Frontends', defaultValue: '' },
      ],
    },
    {
      id: 'configuration',
      title: 'Configuration',
      fields: [
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'tier', label: 'Tier', defaultValue: '' },
        { id: 'zones', label: 'Availability Zones', defaultValue: '' },
        { id: 'idleTimeout', label: 'Idle Timeout (minutes)', defaultValue: '' },
      ],
    },
    {
      id: 'endpoints',
      title: 'Endpoints',
      fields: [
        { id: 'frontendIpConfig', label: 'Frontend IP Config', defaultValue: '' },
        { id: 'backendPool', label: 'Backend Pool', defaultValue: '' },
        { id: 'probe', label: 'Health Probe', defaultValue: '' },
        { id: 'rule', label: 'Load Balancing Rule', defaultValue: '' },
      ],
    },
  ]),
};

const publicIpSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'configuration.sku', label: 'SKU' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'allocation', label: 'Allocation Method', defaultValue: '' },
        { id: 'version', label: 'IP Version', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'configuration',
      title: 'Configuration',
      fields: [
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'tier', label: 'Tier', defaultValue: '' },
        { id: 'dns', label: 'DNS Label', defaultValue: '' },
        { id: 'idleTimeout', label: 'Idle Timeout (minutes)', defaultValue: '' },
      ],
    },
    {
      id: 'association',
      title: 'Association',
      fields: [
        { id: 'resource', label: 'Attached Resource', defaultValue: '' },
        { id: 'resourceType', label: 'Resource Type', defaultValue: '' },
        { id: 'ipConfiguration', label: 'IP Configuration', defaultValue: '' },
      ],
    },
  ]),
};

const natGatewaySchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [{ id: 'overview.region', label: 'Region' }],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'publicIps', label: 'Public IPs Attached', defaultValue: '' },
        { id: 'idleTimeout', label: 'Idle Timeout (minutes)', defaultValue: '' },
      ],
    },
    {
      id: 'configuration',
      title: 'Configuration',
      fields: [
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'zones', label: 'Availability Zones', defaultValue: '' },
        { id: 'subnets', label: 'Subnets', defaultValue: '' },
        { id: 'outboundIps', label: 'Outbound IP Addresses', defaultValue: '' },
      ],
    },
  ]),
};

const networkInterfaceSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [{ id: 'overview.region', label: 'Region' }],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'macAddress', label: 'MAC Address', defaultValue: '' },
        { id: 'acceleratedNetworking', label: 'Accelerated Networking', defaultValue: '' },
      ],
    },
    {
      id: 'ipConfiguration',
      title: 'IP Configuration',
      fields: [
        { id: 'privateIp', label: 'Private IP', defaultValue: '' },
        { id: 'allocation', label: 'Private IP Allocation', defaultValue: '' },
        { id: 'subnet', label: 'Subnet', defaultValue: '' },
        { id: 'publicIp', label: 'Public IP', defaultValue: '' },
      ],
    },
    {
      id: 'security',
      title: 'Security',
      fields: [
        { id: 'nsg', label: 'Network Security Group', defaultValue: '' },
        { id: 'asg', label: 'Application Security Group', defaultValue: '' },
        { id: 'dnsServers', label: 'DNS Servers', defaultValue: '' },
      ],
    },
  ]),
};

const bastionSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'network.vnet', label: 'Virtual Network' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'tier', label: 'Tier', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'concurrentSessions', label: 'Concurrent Sessions', defaultValue: '' },
      ],
    },
    {
      id: 'network',
      title: 'Network',
      fields: [
        { id: 'vnet', label: 'Virtual Network', defaultValue: '' },
        { id: 'subnet', label: 'Bastion Subnet', defaultValue: '' },
        { id: 'publicIp', label: 'Public IP', defaultValue: '' },
      ],
    },
    {
      id: 'access',
      title: 'Access',
      fields: [
        { id: 'protocols', label: 'Enabled Protocols', defaultValue: '' },
        { id: 'ipWhitelist', label: 'IP Whitelist', defaultValue: '' },
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
  disk: diskSchema,
  functionApp: functionAppSchema,
  appService: appServiceSchema,
  vmScaleSet: vmScaleSetSchema,
  loadBalancer: loadBalancerSchema,
  publicIp: publicIpSchema,
  natGateway: natGatewaySchema,
  networkInterface: networkInterfaceSchema,
  bastion: bastionSchema,
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
