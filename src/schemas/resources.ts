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

const azureFilesSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.accountName', label: 'Storage Account' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'accountName', label: 'Storage Account', defaultValue: '' },
        { id: 'protocols', label: 'Protocols (SMB/NFS)', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'shares',
      title: 'Shares',
      fields: [
        { id: 'shareCount', label: 'Total Shares', defaultValue: '' },
        { id: 'defaultShare', label: 'Default Share', defaultValue: '' },
        { id: 'quotaGiB', label: 'Allocated Quota (GiB)', defaultValue: '' },
        { id: 'backupPolicy', label: 'Backup Policy', defaultValue: '' },
      ],
    },
    {
      id: 'security',
      title: 'Security',
      fields: [
        { id: 'encryption', label: 'Encryption', defaultValue: '' },
        { id: 'identity', label: 'Managed Identity', defaultValue: '' },
        { id: 'networkRules', label: 'Network Rules', defaultValue: '' },
      ],
    },
  ]),
};

const dataLakeSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.accountTier', label: 'Account Tier' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'accountKind', label: 'Account Kind', defaultValue: '' },
        { id: 'accountTier', label: 'Account Tier', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'namespaces',
      title: 'Namespaces',
      fields: [
        { id: 'filesystemCount', label: 'File Systems', defaultValue: '' },
        { id: 'defaultFilesystem', label: 'Default File System', defaultValue: '' },
        { id: 'hierarchicalNamespace', label: 'Hierarchical Namespace', defaultValue: '' },
        { id: 'primaryEndpoint', label: 'Primary Endpoint', defaultValue: '' },
      ],
    },
    {
      id: 'security',
      title: 'Security & Governance',
      fields: [
        { id: 'encryption', label: 'Encryption State', defaultValue: '' },
        { id: 'networkAccess', label: 'Network Access', defaultValue: '' },
        { id: 'firewallRules', label: 'Firewall Rules', defaultValue: '' },
        { id: 'managedIdentities', label: 'Managed Identities', defaultValue: '' },
      ],
    },
    {
      id: 'analytics',
      title: 'Analytics Integration',
      fields: [
        { id: 'synapseLinks', label: 'Synapse Links', defaultValue: '' },
        { id: 'lakehouseConnections', label: 'Lakehouse Connections', defaultValue: '' },
        { id: 'ingestionPipelines', label: 'Ingestion Pipelines', defaultValue: '' },
      ],
    },
  ]),
};

const storageQueueSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.accountName', label: 'Storage Account' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'queueName', label: 'Queue Name', defaultValue: '' },
        { id: 'accountName', label: 'Storage Account', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'capacity',
      title: 'Capacity & Throughput',
      fields: [
        { id: 'messageCount', label: 'Approx Messages', defaultValue: '' },
        { id: 'oldestMessageAge', label: 'Oldest Message Age', defaultValue: '' },
        { id: 'ingressRate', label: 'Ingress Rate (msg/s)', defaultValue: '' },
        { id: 'egressRate', label: 'Egress Rate (msg/s)', defaultValue: '' },
      ],
    },
    {
      id: 'endpoints',
      title: 'Endpoints & Security',
      fields: [
        { id: 'primaryEndpoint', label: 'Primary Endpoint', defaultValue: '' },
        { id: 'authorization', label: 'Authorization Mode', defaultValue: '' },
        { id: 'encryption', label: 'Encryption', defaultValue: '' },
      ],
    },
  ]),
};

const azureSqlDatabaseSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'compute.computeTier', label: 'Compute Tier' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'serverName', label: 'Logical Server', defaultValue: '' },
        { id: 'serviceObjective', label: 'Service Objective', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'compute',
      title: 'Compute & Storage',
      fields: [
        { id: 'computeTier', label: 'Compute Tier', defaultValue: '' },
        { id: 'vcores', label: 'vCores', defaultValue: '' },
        { id: 'maxStorage', label: 'Max Storage (GB)', defaultValue: '' },
        { id: 'backupStorage', label: 'Backup Storage (GB)', defaultValue: '' },
      ],
    },
    {
      id: 'resiliency',
      title: 'Resiliency',
      fields: [
        { id: 'ha', label: 'High Availability Mode', defaultValue: '' },
        { id: 'geoReplication', label: 'Geo Replication', defaultValue: '' },
        { id: 'backupRetention', label: 'Backup Retention', defaultValue: '' },
      ],
    },
    {
      id: 'connectivity',
      title: 'Connectivity',
      fields: [
        { id: 'connectionString', label: 'Connection String', defaultValue: '' },
        { id: 'failoverGroup', label: 'Failover Group', defaultValue: '' },
        { id: 'firewallRules', label: 'Firewall Rules', defaultValue: '' },
      ],
    },
  ]),
};

const managedSqlInstanceSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.licenseType', label: 'License Type' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'instanceName', label: 'Instance Name', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'licenseType', label: 'License Type', defaultValue: '' },
      ],
    },
    {
      id: 'compute',
      title: 'Compute & Storage',
      fields: [
        { id: 'vcores', label: 'vCores', defaultValue: '' },
        { id: 'hardwareGeneration', label: 'Hardware Gen', defaultValue: '' },
        { id: 'storageSize', label: 'Storage Size (GB)', defaultValue: '' },
        { id: 'tempdbSize', label: 'tempdb Size', defaultValue: '' },
      ],
    },
    {
      id: 'networking',
      title: 'Networking',
      fields: [
        { id: 'virtualNetwork', label: 'Virtual Network', defaultValue: '' },
        { id: 'subnet', label: 'Subnet', defaultValue: '' },
        { id: 'privateEndpoint', label: 'Private Endpoint', defaultValue: '' },
      ],
    },
    {
      id: 'maintenance',
      title: 'Maintenance',
      fields: [
        { id: 'serviceTier', label: 'Service Tier', defaultValue: '' },
        { id: 'backupRetention', label: 'Backup Retention', defaultValue: '' },
        { id: 'latestPatch', label: 'Latest Patch', defaultValue: '' },
      ],
    },
  ]),
};

const relationalMySqlSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'compute.computeTier', label: 'Compute Tier' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'serverName', label: 'Server Name', defaultValue: '' },
        { id: 'version', label: 'Engine Version', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'compute',
      title: 'Compute & Storage',
      fields: [
        { id: 'computeTier', label: 'Compute Tier', defaultValue: '' },
        { id: 'vcores', label: 'vCores', defaultValue: '' },
        { id: 'storage', label: 'Storage (GB)', defaultValue: '' },
        { id: 'iops', label: 'IOPS', defaultValue: '' },
      ],
    },
    {
      id: 'availability',
      title: 'Availability',
      fields: [
        { id: 'haMode', label: 'High Availability Mode', defaultValue: '' },
        { id: 'backupRetention', label: 'Backup Retention', defaultValue: '' },
        { id: 'geoRedundantBackup', label: 'Geo-Redundant Backup', defaultValue: '' },
      ],
    },
    {
      id: 'networking',
      title: 'Networking',
      fields: [
        { id: 'endpoint', label: 'Connection Endpoint', defaultValue: '' },
        { id: 'firewallRules', label: 'Firewall Rules', defaultValue: '' },
        { id: 'privateAccess', label: 'Private Access', defaultValue: '' },
      ],
    },
  ]),
};

const azureDatabaseForMySqlSchema: ResourceSchema = relationalMySqlSchema;

const azureDatabaseForMariaDbSchema: ResourceSchema = {
  ...relationalMySqlSchema,
  sections: relationalMySqlSchema.sections.map((section) => {
    if (section.id !== 'overview') {
      return section;
    }
    return {
      ...section,
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'serverName', label: 'Server Name', defaultValue: '' },
        { id: 'version', label: 'MariaDB Version', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    };
  }),
};

const azureDatabaseForPostgreSqlSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'compute.computeTier', label: 'Compute Tier' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'serverName', label: 'Server Name', defaultValue: '' },
        { id: 'version', label: 'PostgreSQL Version', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'compute',
      title: 'Compute & Storage',
      fields: [
        { id: 'computeTier', label: 'Compute Tier', defaultValue: '' },
        { id: 'vcores', label: 'vCores', defaultValue: '' },
        { id: 'storage', label: 'Storage (GB)', defaultValue: '' },
        { id: 'maxConnections', label: 'Max Connections', defaultValue: '' },
      ],
    },
    {
      id: 'availability',
      title: 'Availability',
      fields: [
        { id: 'haMode', label: 'High Availability Mode', defaultValue: '' },
        { id: 'backupRetention', label: 'Backup Retention', defaultValue: '' },
        { id: 'maintenanceWindow', label: 'Maintenance Window', defaultValue: '' },
      ],
    },
    {
      id: 'networking',
      title: 'Networking',
      fields: [
        { id: 'endpoint', label: 'Connection Endpoint', defaultValue: '' },
        { id: 'privateEndpoint', label: 'Private Endpoint', defaultValue: '' },
        { id: 'firewallRules', label: 'Firewall Rules', defaultValue: '' },
      ],
    },
  ]),
};

const azureCosmosDbSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Primary Region' },
    { id: 'consistency.model', label: 'Consistency' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'api', label: 'API (Core, Mongo, Gremlin, etc.)', defaultValue: '' },
        { id: 'accountName', label: 'Account Name', defaultValue: '' },
        { id: 'region', label: 'Primary Region', defaultValue: '' },
      ],
    },
    {
      id: 'throughput',
      title: 'Throughput',
      fields: [
        { id: 'provisionedRUs', label: 'Provisioned RUs', defaultValue: '' },
        { id: 'autopilot', label: 'Autoscale Max RUs', defaultValue: '' },
        { id: 'databases', label: 'Database Count', defaultValue: '' },
      ],
    },
    {
      id: 'consistency',
      title: 'Consistency & Replication',
      fields: [
        { id: 'model', label: 'Consistency Level', defaultValue: '' },
        { id: 'regions', label: 'Replicated Regions', defaultValue: '' },
        { id: 'multiWrite', label: 'Multi-Write', defaultValue: '' },
      ],
    },
    {
      id: 'security',
      title: 'Security',
      fields: [
        { id: 'keys', label: 'Key Rotation State', defaultValue: '' },
        { id: 'privateEndpoints', label: 'Private Endpoints', defaultValue: '' },
        { id: 'roleAssignments', label: 'Role Assignments', defaultValue: '' },
      ],
    },
  ]),
};

const oracleDatabaseSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.shape', label: 'Shape' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'dbName', label: 'Database Name', defaultValue: '' },
        { id: 'workloadType', label: 'Workload Type', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'configuration',
      title: 'Configuration',
      fields: [
        { id: 'shape', label: 'Shape', defaultValue: '' },
        { id: 'cpuCoreCount', label: 'CPU Cores', defaultValue: '' },
        { id: 'memory', label: 'Memory (GB)', defaultValue: '' },
        { id: 'storage', label: 'Storage (TB)', defaultValue: '' },
      ],
    },
    {
      id: 'availability',
      title: 'Availability & Protection',
      fields: [
        { id: 'ha', label: 'High Availability', defaultValue: '' },
        { id: 'backupWindow', label: 'Backup Window', defaultValue: '' },
        { id: 'dataGuard', label: 'Data Guard', defaultValue: '' },
      ],
    },
    {
      id: 'connectivity',
      title: 'Connectivity',
      fields: [
        { id: 'listenerEndpoint', label: 'Listener Endpoint', defaultValue: '' },
        { id: 'subnet', label: 'Subnet', defaultValue: '' },
        { id: 'firewallRules', label: 'Firewall Rules', defaultValue: '' },
      ],
    },
  ]),
};

const apiManagementSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.tier', label: 'Tier' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'name', label: 'Service Name', defaultValue: '' },
        { id: 'tier', label: 'Tier', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'gateways',
      title: 'Gateways',
      fields: [
        { id: 'primaryRegion', label: 'Primary Region', defaultValue: '' },
        { id: 'additionalRegions', label: 'Additional Regions', defaultValue: '' },
        { id: 'customDomains', label: 'Custom Domains', defaultValue: '' },
      ],
    },
    {
      id: 'security',
      title: 'Security & Policies',
      fields: [
        { id: 'policyCount', label: 'Policy Count', defaultValue: '' },
        { id: 'certificates', label: 'Certificates', defaultValue: '' },
        { id: 'authServers', label: 'Authorization Servers', defaultValue: '' },
      ],
    },
    {
      id: 'analytics',
      title: 'Analytics',
      fields: [
        { id: 'requestVolume', label: 'Request Volume (avg/day)', defaultValue: '' },
        { id: 'successRate', label: 'Success Rate', defaultValue: '' },
        { id: 'latency', label: 'Avg Latency', defaultValue: '' },
      ],
    },
  ]),
};

const dataFactorySchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.version', label: 'Version' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'gitMode', label: 'Git Mode', defaultValue: '' },
        { id: 'integrationRuntime', label: 'Default Integration Runtime', defaultValue: '' },
      ],
    },
    {
      id: 'pipelines',
      title: 'Pipelines & Triggers',
      fields: [
        { id: 'pipelineCount', label: 'Pipelines', defaultValue: '' },
        { id: 'triggerCount', label: 'Triggers', defaultValue: '' },
        { id: 'lastRun', label: 'Last Successful Run', defaultValue: '' },
      ],
    },
    {
      id: 'integrationRuntimes',
      title: 'Integration Runtimes',
      fields: [
        { id: 'azureRuntimes', label: 'Azure Runtimes', defaultValue: '' },
        { id: 'selfHostedRuntimes', label: 'Self-Hosted Runtimes', defaultValue: '' },
        { id: 'linkedIRs', label: 'Linked IRs', defaultValue: '' },
      ],
    },
    {
      id: 'connections',
      title: 'Connections',
      fields: [
        { id: 'linkedServices', label: 'Linked Services', defaultValue: '' },
        { id: 'datasets', label: 'Datasets', defaultValue: '' },
        { id: 'managedVirtualNetwork', label: 'Managed VNet', defaultValue: '' },
      ],
    },
  ]),
};

const eventGridSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.topicType', label: 'Topic Type' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'topicType', label: 'Topic Type', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'endpoint', label: 'Endpoint', defaultValue: '' },
      ],
    },
    {
      id: 'subscriptions',
      title: 'Event Subscriptions',
      fields: [
        { id: 'subscriptionCount', label: 'Subscriptions', defaultValue: '' },
        { id: 'deadLettering', label: 'Dead-Lettering', defaultValue: '' },
        { id: 'filters', label: 'Advanced Filters', defaultValue: '' },
      ],
    },
    {
      id: 'delivery',
      title: 'Delivery',
      fields: [
        { id: 'successRate', label: 'Delivery Success Rate', defaultValue: '' },
        { id: 'retryPolicy', label: 'Retry Policy', defaultValue: '' },
        { id: 'lastEventTime', label: 'Last Event Time', defaultValue: '' },
      ],
    },
  ]),
};

const eventHubSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'throughput.throughputUnits', label: 'Throughput Units' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'namespace', label: 'Namespace', defaultValue: '' },
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'throughput',
      title: 'Throughput & Retention',
      fields: [
        { id: 'throughputUnits', label: 'Throughput Units', defaultValue: '' },
        { id: 'partitionCount', label: 'Partition Count', defaultValue: '' },
        { id: 'retentionHours', label: 'Retention (hours)', defaultValue: '' },
      ],
    },
    {
      id: 'security',
      title: 'Security',
      fields: [
        { id: 'encryption', label: 'Encryption', defaultValue: '' },
        { id: 'networkRules', label: 'Network Rules', defaultValue: '' },
        { id: 'sharedAccessPolicies', label: 'Shared Access Policies', defaultValue: '' },
      ],
    },
  ]),
};

const logicAppSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.plan', label: 'Plan' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'workflowName', label: 'Workflow Name', defaultValue: '' },
        { id: 'plan', label: 'Plan', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'workflow',
      title: 'Workflow',
      fields: [
        { id: 'triggerType', label: 'Trigger Type', defaultValue: '' },
        { id: 'connectorCount', label: 'Connector Count', defaultValue: '' },
        { id: 'actionCount', label: 'Action Count', defaultValue: '' },
      ],
    },
    {
      id: 'monitoring',
      title: 'Monitoring',
      fields: [
        { id: 'runHistory', label: 'Recent Run Status', defaultValue: '' },
        { id: 'failures24h', label: 'Failures (24h)', defaultValue: '' },
        { id: 'integrationAccount', label: 'Integration Account', defaultValue: '' },
      ],
    },
  ]),
};

const serviceBusSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.sku', label: 'SKU' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'namespace', label: 'Namespace', defaultValue: '' },
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'messaging',
      title: 'Queues & Topics',
      fields: [
        { id: 'queueCount', label: 'Queue Count', defaultValue: '' },
        { id: 'topicCount', label: 'Topic Count', defaultValue: '' },
        { id: 'maxSize', label: 'Max Size (GB)', defaultValue: '' },
      ],
    },
    {
      id: 'security',
      title: 'Security',
      fields: [
        { id: 'networkRules', label: 'Network Rules', defaultValue: '' },
        { id: 'sharedAccessPolicies', label: 'Shared Access Policies', defaultValue: '' },
        { id: 'privateEndpoints', label: 'Private Endpoints', defaultValue: '' },
      ],
    },
  ]),
};

const automationAccountSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.runAsAccount', label: 'Run As Account' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'accountName', label: 'Account Name', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'runAsAccount', label: 'Run As Account', defaultValue: '' },
      ],
    },
    {
      id: 'runbooks',
      title: 'Runbooks & Workers',
      fields: [
        { id: 'runbookCount', label: 'Runbook Count', defaultValue: '' },
        { id: 'hybridWorkerGroups', label: 'Hybrid Worker Groups', defaultValue: '' },
        { id: 'updateDeployments', label: 'Update Deployments', defaultValue: '' },
      ],
    },
    {
      id: 'jobs',
      title: 'Jobs & Schedules',
      fields: [
        { id: 'scheduledJobs', label: 'Scheduled Jobs', defaultValue: '' },
        { id: 'jobs24h', label: 'Jobs (24h)', defaultValue: '' },
        { id: 'lastJobStatus', label: 'Last Job Status', defaultValue: '' },
      ],
    },
    {
      id: 'integrations',
      title: 'Integrations',
      fields: [
        { id: 'logAnalyticsWorkspace', label: 'Log Analytics Workspace', defaultValue: '' },
        { id: 'linkedKeyVault', label: 'Linked Key Vault', defaultValue: '' },
        { id: 'managedIdentity', label: 'Managed Identity', defaultValue: '' },
      ],
    },
  ]),
};

const azureMonitorSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'signals.defaultScope', label: 'Default Scope' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'defaultScope', label: 'Default Scope', defaultValue: '' },
        { id: 'dataCollectionEndpoint', label: 'Data Collection Endpoint', defaultValue: '' },
      ],
    },
    {
      id: 'signals',
      title: 'Signals & Alerts',
      fields: [
        { id: 'metricAlerts', label: 'Metric Alerts', defaultValue: '' },
        { id: 'logAlerts', label: 'Log Alerts', defaultValue: '' },
        { id: 'notificationGroups', label: 'Notification Groups', defaultValue: '' },
      ],
    },
    {
      id: 'insights',
      title: 'Insights',
      fields: [
        { id: 'appInsights', label: 'Application Insights', defaultValue: '' },
        { id: 'vmInsights', label: 'VM Insights', defaultValue: '' },
        { id: 'containerInsights', label: 'Container Insights', defaultValue: '' },
      ],
    },
    {
      id: 'dataCollection',
      title: 'Data Collection',
      fields: [
        { id: 'dataCollectionRules', label: 'Data Collection Rules', defaultValue: '' },
        { id: 'monitoredResources', label: 'Monitored Resources', defaultValue: '' },
        { id: 'logAnalyticsWorkspace', label: 'Target Workspace', defaultValue: '' },
      ],
    },
  ]),
};

const logAnalyticsWorkspaceSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.workspaceId', label: 'Workspace ID' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'workspaceName', label: 'Workspace Name', defaultValue: '' },
        { id: 'workspaceId', label: 'Workspace ID', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'ingestion',
      title: 'Ingestion & Retention',
      fields: [
        { id: 'dailyVolume', label: 'Daily Volume (GB)', defaultValue: '' },
        { id: 'retentionDays', label: 'Retention (days)', defaultValue: '' },
        { id: 'dataSources', label: 'Data Sources', defaultValue: '' },
      ],
    },
    {
      id: 'solutions',
      title: 'Solutions & Insights',
      fields: [
        { id: 'insights', label: 'Insights Enabled', defaultValue: '' },
        { id: 'workbooks', label: 'Workbooks', defaultValue: '' },
        { id: 'savedSearches', label: 'Saved Searches', defaultValue: '' },
      ],
    },
    {
      id: 'security',
      title: 'Security',
      fields: [
        { id: 'linkedSentinel', label: 'Microsoft Sentinel', defaultValue: '' },
        { id: 'customerManagedKey', label: 'Customer-Managed Key', defaultValue: '' },
        { id: 'privateLinks', label: 'Private Links', defaultValue: '' },
      ],
    },
  ]),
};

const sentinelWorkspaceSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.workspaceName', label: 'Workspace' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'workspaceName', label: 'Workspace Name', defaultValue: '' },
        { id: 'serviceTier', label: 'Service Tier', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
      ],
    },
    {
      id: 'detections',
      title: 'Detections',
      fields: [
        { id: 'analyticRules', label: 'Analytic Rules', defaultValue: '' },
        { id: 'automationRules', label: 'Automation Rules', defaultValue: '' },
        { id: 'playbooks', label: 'Playbooks', defaultValue: '' },
      ],
    },
    {
      id: 'operations',
      title: 'Operations',
      fields: [
        { id: 'incidents24h', label: 'Incidents (24h)', defaultValue: '' },
        { id: 'activeInvestigations', label: 'Active Investigations', defaultValue: '' },
        { id: 'huntingQueries', label: 'Hunting Queries', defaultValue: '' },
      ],
    },
    {
      id: 'connectors',
      title: 'Data Connectors',
      fields: [
        { id: 'connectedSources', label: 'Connected Sources', defaultValue: '' },
        { id: 'dataConnectors', label: 'Data Connectors', defaultValue: '' },
        { id: 'logAnalyticsWorkspace', label: 'Log Analytics Workspace', defaultValue: '' },
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

const applicationGatewaySchema: ResourceSchema = {
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
        { id: 'tier', label: 'Tier', defaultValue: '' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'capacity', label: 'Capacity', defaultValue: '' },
      ],
    },
    {
      id: 'configuration',
      title: 'Configuration',
      fields: [
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'wafMode', label: 'WAF Mode', defaultValue: '' },
        { id: 'zones', label: 'Availability Zones', defaultValue: '' },
      ],
    },
    {
      id: 'listeners',
      title: 'Listeners',
      fields: [
        { id: 'frontendIp', label: 'Frontend IP', defaultValue: '' },
        { id: 'listener', label: 'Listener Name', defaultValue: '' },
        { id: 'listenerType', label: 'Listener Type', defaultValue: '' },
      ],
    },
  ]),
};

const expressRouteCircuitSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'configuration.bandwidth', label: 'Bandwidth' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'serviceProvider', label: 'Service Provider', defaultValue: '' },
        { id: 'peeringLocation', label: 'Peering Location', defaultValue: '' },
      ],
    },
    {
      id: 'configuration',
      title: 'Configuration',
      fields: [
        { id: 'bandwidth', label: 'Bandwidth', defaultValue: '' },
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'redundancy', label: 'Redundancy', defaultValue: '' },
      ],
    },
    {
      id: 'peerings',
      title: 'Peerings',
      fields: [
        { id: 'primaryPeering', label: 'Primary Peering', defaultValue: '' },
        { id: 'secondaryPeering', label: 'Secondary Peering', defaultValue: '' },
        { id: 'expressRouteGateway', label: 'ExpressRoute Gateway', defaultValue: '' },
      ],
    },
  ]),
};

const kubernetesClusterSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.version', label: 'Kubernetes Version' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'version', label: 'Kubernetes Version', defaultValue: '' },
        { id: 'nodeCount', label: 'Node Count', defaultValue: '' },
      ],
    },
    {
      id: 'controlPlane',
      title: 'Control Plane',
      fields: [
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'availabilityZones', label: 'Availability Zones', defaultValue: '' },
        { id: 'rbac', label: 'RBAC Enabled', defaultValue: '' },
      ],
    },
    {
      id: 'nodePools',
      title: 'Node Pools',
      fields: [
        { id: 'defaultPool', label: 'Default Node Pool', defaultValue: '' },
        { id: 'vmSize', label: 'VM Size', defaultValue: '' },
        { id: 'autoScale', label: 'Auto Scale', defaultValue: '' },
      ],
    },
  ]),
};

const containerInstanceSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.resourceGroup', label: 'Resource Group' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'image', label: 'Container Image', defaultValue: '' },
        { id: 'cpu', label: 'vCPU', defaultValue: '' },
        { id: 'memory', label: 'Memory (GiB)', defaultValue: '' },
      ],
    },
    {
      id: 'network',
      title: 'Network',
      fields: [
        { id: 'subnet', label: 'Subnet', defaultValue: '' },
        { id: 'publicIp', label: 'Public IP', defaultValue: '' },
        { id: 'ports', label: 'Exposed Ports', defaultValue: '' },
      ],
    },
  ]),
};

const batchAccountSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.poolQuota', label: 'Pool Quota' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'accountEndpoint', label: 'Account Endpoint', defaultValue: '' },
        { id: 'autoStorage', label: 'Auto Storage', defaultValue: '' },
      ],
    },
    {
      id: 'quotas',
      title: 'Quotas',
      fields: [
        { id: 'poolQuota', label: 'Pool Quota', defaultValue: '' },
        { id: 'coreQuota', label: 'Core Quota', defaultValue: '' },
        { id: 'jobQuota', label: 'Job Quota', defaultValue: '' },
      ],
    },
  ]),
};

const virtualNetworkGatewaySchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'configuration.gatewayType', label: 'Gateway Type' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'gatewayType', label: 'Gateway Type', defaultValue: '' },
        { id: 'vpnType', label: 'VPN Type', defaultValue: '' },
      ],
    },
    {
      id: 'configuration',
      title: 'Configuration',
      fields: [
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'activeActive', label: 'Active-Active', defaultValue: '' },
        { id: 'enableBgp', label: 'BGP Enabled', defaultValue: '' },
      ],
    },
    {
      id: 'connections',
      title: 'Connections',
      fields: [
        { id: 'vpnConnections', label: 'VPN Connections', defaultValue: '' },
        { id: 'expressRouteConnections', label: 'ExpressRoute Connections', defaultValue: '' },
      ],
    },
  ]),
};

const localNetworkGatewaySchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [{ id: 'overview.region', label: 'Region' }],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'gatewayIp', label: 'Gateway IP Address', defaultValue: '' },
        { id: 'addressSpace', label: 'Address Space', defaultValue: '' },
      ],
    },
    {
      id: 'connections',
      title: 'Connections',
      fields: [
        { id: 'sharedKey', label: 'Shared Key', defaultValue: '' },
        { id: 'routingWeight', label: 'Routing Weight', defaultValue: '' },
      ],
    },
  ]),
};

const onPremisesNetworkGatewaySchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [{ id: 'overview.location', label: 'Location' }],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'deviceVendor', label: 'Device Vendor', defaultValue: '' },
        { id: 'deviceModel', label: 'Device Model', defaultValue: '' },
        { id: 'gatewayIp', label: 'Gateway IP Address', defaultValue: '' },
      ],
    },
    {
      id: 'networks',
      title: 'Local Networks',
      fields: [
        { id: 'addressPrefixes', label: 'Address Prefixes', defaultValue: '' },
        { id: 'connectionStatus', label: 'Connection Status', defaultValue: '' },
      ],
    },
  ]),
};

const networkSecurityGroupSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [{ id: 'overview.region', label: 'Region' }],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'associatedSubnets', label: 'Associated Subnets', defaultValue: '' },
        { id: 'associatedNics', label: 'Associated NICs', defaultValue: '' },
      ],
    },
    {
      id: 'rules',
      title: 'Security Rules',
      fields: [
        { id: 'inboundRules', label: 'Inbound Rules', defaultValue: '' },
        { id: 'outboundRules', label: 'Outbound Rules', defaultValue: '' },
      ],
    },
  ]),
};

const applicationSecurityGroupSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [{ id: 'overview.region', label: 'Region' }],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'memberCount', label: 'Members', defaultValue: '' },
      ],
    },
    {
      id: 'membership',
      title: 'Membership',
      fields: [
        { id: 'associatedNics', label: 'Associated NICs', defaultValue: '' },
        { id: 'associatedServices', label: 'Associated Services', defaultValue: '' },
      ],
    },
  ]),
};

const keyVaultSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [
    { id: 'overview.region', label: 'Region' },
    { id: 'overview.sku', label: 'SKU' },
  ],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'sku', label: 'SKU', defaultValue: '' },
        { id: 'softDelete', label: 'Soft Delete', defaultValue: '' },
      ],
    },
    {
      id: 'secrets',
      title: 'Secrets',
      fields: [
        { id: 'secretCount', label: 'Secret Count', defaultValue: '' },
        { id: 'keyCount', label: 'Key Count', defaultValue: '' },
        { id: 'certificateCount', label: 'Certificate Count', defaultValue: '' },
      ],
    },
  ]),
};

const ddosProtectionSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [{ id: 'overview.region', label: 'Region' }],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'planType', label: 'Plan Type', defaultValue: '' },
      ],
    },
    {
      id: 'associations',
      title: 'Associations',
      fields: [
        { id: 'virtualNetworks', label: 'Protected vNets', defaultValue: '' },
        { id: 'publicIps', label: 'Protected Public IPs', defaultValue: '' },
      ],
    },
  ]),
};

const webApplicationFirewallSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [{ id: 'overview.region', label: 'Region' }],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'policyMode', label: 'Policy Mode', defaultValue: '' },
      ],
    },
    {
      id: 'rules',
      title: 'Rules',
      fields: [
        { id: 'managedRuleSet', label: 'Managed Rule Set', defaultValue: '' },
        { id: 'customRules', label: 'Custom Rules', defaultValue: '' },
      ],
    },
  ]),
};
const privateEndpointSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [{ id: 'overview.region', label: 'Region' }],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'targetResource', label: 'Target Resource', defaultValue: '' },
        { id: 'subnet', label: 'Subnet', defaultValue: '' },
      ],
    },
    {
      id: 'networking',
      title: 'Networking',
      fields: [
        { id: 'privateIp', label: 'Private IP', defaultValue: '' },
        { id: 'customDns', label: 'Custom DNS Zones', defaultValue: '' },
      ],
    },
  ]),
};

const routeTableSchema: ResourceSchema = {
  statusField: 'overview.status',
  metaFields: [{ id: 'overview.region', label: 'Region' }],
  sections: makeSections([
    {
      id: 'overview',
      title: 'Overview',
      fields: [
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
        { id: 'region', label: 'Region', defaultValue: '' },
        { id: 'associatedSubnets', label: 'Associated Subnets', defaultValue: '' },
      ],
    },
    {
      id: 'routes',
      title: 'Routes',
      fields: [
        { id: 'routeCount', label: 'Route Count', defaultValue: '' },
        { id: 'propagateGatewayRoutes', label: 'Propagate Gateway Routes', defaultValue: '' },
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
  azureFiles: azureFilesSchema,
  dataLake: dataLakeSchema,
  disk: diskSchema,
  functionApp: functionAppSchema,
  appService: appServiceSchema,
  vmScaleSet: vmScaleSetSchema,
  loadBalancer: loadBalancerSchema,
  publicIp: publicIpSchema,
  natGateway: natGatewaySchema,
  networkInterface: networkInterfaceSchema,
  bastion: bastionSchema,
  applicationGateway: applicationGatewaySchema,
  expressRouteCircuit: expressRouteCircuitSchema,
  kubernetesCluster: kubernetesClusterSchema,
  containerInstance: containerInstanceSchema,
  batchAccount: batchAccountSchema,
  virtualNetworkGateway: virtualNetworkGatewaySchema,
  localNetworkGateway: localNetworkGatewaySchema,
  onPremisesNetworkGateway: onPremisesNetworkGatewaySchema,
  networkSecurityGroup: networkSecurityGroupSchema,
  applicationSecurityGroup: applicationSecurityGroupSchema,
  keyVault: keyVaultSchema,
  ddosProtection: ddosProtectionSchema,
  webApplicationFirewall: webApplicationFirewallSchema,
  privateEndpoint: privateEndpointSchema,
  routeTable: routeTableSchema,
  azureSqlDatabase: azureSqlDatabaseSchema,
  managedSqlInstance: managedSqlInstanceSchema,
  azureDatabaseForMySql: azureDatabaseForMySqlSchema,
  azureDatabaseForMariaDb: azureDatabaseForMariaDbSchema,
  azureDatabaseForPostgreSql: azureDatabaseForPostgreSqlSchema,
  azureCosmosDb: azureCosmosDbSchema,
  oracleDatabase: oracleDatabaseSchema,
  storageQueue: storageQueueSchema,
  apiManagement: apiManagementSchema,
  dataFactory: dataFactorySchema,
  eventGrid: eventGridSchema,
  eventHub: eventHubSchema,
  logicApp: logicAppSchema,
  serviceBus: serviceBusSchema,
  automationAccount: automationAccountSchema,
  azureMonitor: azureMonitorSchema,
  logAnalyticsWorkspace: logAnalyticsWorkspaceSchema,
  sentinelWorkspace: sentinelWorkspaceSchema,
  database: storageSchema,
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
