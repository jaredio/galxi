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

type SectionDefinition = {
  id: string;
  title: string;
  fields: Array<{ id: string; label: string; defaultValue?: string }>;
};

type SchemaDefinition = {
  sections: SectionDefinition[];
  statusField?: string;
  metaFields?: Array<{ id: string; label: string }>;
};

const baseMetadataSection: SectionDefinition = {
  id: 'arm',
  title: 'Azure Resource Metadata',
  fields: [
    { id: 'name', label: 'Resource Name' },
    { id: 'resourceType', label: 'Resource Type' },
    { id: 'subscriptionId', label: 'Subscription ID' },
    { id: 'resourceGroup', label: 'Resource Group' },
    { id: 'location', label: 'Location' },
    { id: 'tags', label: 'Tags' },
    { id: 'id', label: 'Resource ID' },
    { id: 'provisioningState', label: 'Provisioning State', defaultValue: 'Succeeded' },
    { id: 'notes', label: 'Notes' },
  ],
};

const hydrateSections = (definitions: SectionDefinition[]): ResourceSectionSchema[] =>
  definitions.map((section) => ({
    id: section.id,
    title: section.title,
    fields: section.fields.map((field) => ({
      id: field.id,
      label: field.label,
      defaultValue: field.defaultValue ?? '',
    })),
  }));

const buildResourceSchema = (definition: SchemaDefinition): ResourceSchema => ({
  statusField: definition.statusField,
  metaFields: definition.metaFields,
  sections: makeSections(hydrateSections([baseMetadataSection, ...definition.sections])),
});

const vmSchema: ResourceSchema = buildResourceSchema({
  statusField: 'compute.powerState',
  metaFields: [
    { id: 'compute.vmSize', label: 'VM Size' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'compute',
      title: 'Compute Configuration',
      fields: [
        { id: 'vmSize', label: 'VM Size' },
        { id: 'osType', label: 'OS Type' },
        { id: 'computeGeneration', label: 'Compute Generation' },
        { id: 'availabilitySetId', label: 'Availability Set ID' },
        { id: 'availabilityZone', label: 'Availability Zone' },
        { id: 'adminUsername', label: 'Admin Username' },
        { id: 'identityType', label: 'Identity Type' },
        { id: 'powerState', label: 'Power State', defaultValue: 'Unknown' },
        { id: 'bootDiagnosticsEnabled', label: 'Boot Diagnostics Enabled' },
      ],
    },
    {
      id: 'storage',
      title: 'OS & Data Disks',
      fields: [
        { id: 'osDiskStorageType', label: 'OS Disk Storage Type' },
        { id: 'osDiskSizeGb', label: 'OS Disk Size (GB)' },
        { id: 'dataDiskCount', label: 'Data Disk Count' },
        { id: 'dataDiskSizeGb', label: 'Data Disk Size (GB)' },
        { id: 'dataDiskStorageType', label: 'Data Disk Storage Type' },
      ],
    },
    {
      id: 'networking',
      title: 'Networking',
      fields: [
        { id: 'nicIds', label: 'NIC IDs' },
        { id: 'primaryNicId', label: 'Primary NIC ID' },
        { id: 'privateIpAddress', label: 'Private IP Address' },
        { id: 'publicIpAddress', label: 'Public IP Address' },
        { id: 'virtualNetwork', label: 'Virtual Network' },
        { id: 'subnet', label: 'Subnet' },
      ],
    },
  ],
});

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

const storageSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'storageAccount.sku', label: 'SKU' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'storageAccount',
      title: 'Storage Account Configuration',
      fields: [
        { id: 'sku', label: 'SKU' },
        { id: 'kind', label: 'Kind (StorageV2, BlobStorage, etc.)' },
        { id: 'accessTier', label: 'Access Tier (Hot/Cool)' },
        { id: 'supportsHttpsTrafficOnly', label: 'HTTPS Traffic Only Enabled' },
      ],
    },
  ],
});

const azureFilesSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'fileShare.shareQuotaGb', label: 'Quota (GB)' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'fileShare',
      title: 'Azure Files Share',
      fields: [
        { id: 'shareQuotaGb', label: 'Share Quota (GB)' },
        { id: 'protocolsEnabled', label: 'Protocols Enabled (SMB/NFS)' },
      ],
    },
  ],
});

const dataLakeSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'dataLake.accountTier', label: 'Account Tier' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'dataLake',
      title: 'Data Lake Storage Gen2',
      fields: [
        { id: 'hierarchicalNamespace', label: 'Hierarchical Namespace Enabled' },
        { id: 'filesystemCount', label: 'Filesystem Count' },
      ],
    },
  ],
});

const storageQueueSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'queue.queueName', label: 'Queue Name' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'queue',
      title: 'Storage Queue',
      fields: [
        { id: 'queueName', label: 'Queue Name' },
        { id: 'accountName', label: 'Storage Account' },
        { id: 'messageCount', label: 'Approx Messages' },
        { id: 'maxDeliveryCount', label: 'Max Delivery Count' },
      ],
    },
    {
      id: 'throughput',
      title: 'Throughput & Security',
      fields: [
        { id: 'ingressRate', label: 'Ingress Rate (msg/s)' },
        { id: 'egressRate', label: 'Egress Rate (msg/s)' },
        { id: 'authorization', label: 'Authorization Mode' },
        { id: 'encryption', label: 'Encryption' },
      ],
    },
  ],
});

const azureSqlDatabaseSchema: ResourceSchema = buildResourceSchema({
  statusField: 'database.status',
  metaFields: [
    { id: 'database.serverName', label: 'SQL Server' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'database',
      title: 'Azure SQL Database',
      fields: [
        { id: 'serverName', label: 'Logical Server Name' },
        { id: 'tier', label: 'Tier (DTU/vCore)' },
        { id: 'computeSize', label: 'Compute Size' },
        { id: 'maxSizeGb', label: 'Max Size (GB)' },
        { id: 'collation', label: 'Collation' },
        { id: 'status', label: 'Status', defaultValue: 'Unknown' },
      ],
    },
  ],
});

const managedSqlInstanceSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'managedInstance.vCores', label: 'vCores' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'managedInstance',
      title: 'SQL Managed Instance',
      fields: [
        { id: 'vCores', label: 'vCores' },
        { id: 'storageGb', label: 'Storage (GB)' },
        { id: 'licenseType', label: 'License Type' },
        { id: 'subnetId', label: 'Subnet Resource ID' },
      ],
    },
  ],
});

const buildFlexibleServerSchema = (engineName: string, versionLabel: string): ResourceSchema =>
  buildResourceSchema({
    statusField: 'arm.provisioningState',
    metaFields: [
      { id: 'flexibleServer.version', label: versionLabel },
      { id: 'arm.location', label: 'Region' },
    ],
    sections: [
      {
        id: 'flexibleServer',
        title: `${engineName} Flexible Server`,
        fields: [
          { id: 'version', label: versionLabel },
          { id: 'vCores', label: 'vCores' },
          { id: 'storageGb', label: 'Storage (GB)' },
          { id: 'highAvailability', label: 'High Availability' },
          { id: 'backupRetentionDays', label: 'Backup Retention (days)' },
        ],
      },
    ],
  });

const azureDatabaseForMySqlSchema: ResourceSchema = buildFlexibleServerSchema(
  'MySQL',
  'MySQL Version'
);

const azureDatabaseForMariaDbSchema: ResourceSchema = buildFlexibleServerSchema(
  'MariaDB',
  'MariaDB Version'
);

const azureDatabaseForPostgreSqlSchema: ResourceSchema = buildFlexibleServerSchema(
  'PostgreSQL',
  'PostgreSQL Version'
);

const azureCosmosDbSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'cosmos.apiKind', label: 'API Kind' },
    { id: 'arm.location', label: 'Primary Region' },
  ],
  sections: [
    {
      id: 'cosmos',
      title: 'Azure Cosmos DB',
      fields: [
        { id: 'apiKind', label: 'API Kind (SQL/Mongo/etc.)' },
        { id: 'consistencyLevel', label: 'Consistency Level' },
        { id: 'automaticFailover', label: 'Automatic Failover Enabled' },
        { id: 'writeRegions', label: 'Write Regions' },
        { id: 'readRegions', label: 'Read Regions' },
      ],
    },
  ],
});

const oracleDatabaseSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'oracle.workloadType', label: 'Workload Type' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'oracle',
      title: 'Oracle Database',
      fields: [
        { id: 'dbName', label: 'Database Name' },
        { id: 'workloadType', label: 'Workload Type' },
        { id: 'shape', label: 'Shape' },
        { id: 'cpuCoreCount', label: 'CPU Cores' },
        { id: 'memoryGb', label: 'Memory (GB)' },
        { id: 'storageTb', label: 'Storage (TB)' },
        { id: 'highAvailability', label: 'High Availability' },
        { id: 'backupWindow', label: 'Backup Window' },
        { id: 'dataGuard', label: 'Data Guard Enabled' },
        { id: 'listenerEndpoint', label: 'Listener Endpoint' },
        { id: 'subnetId', label: 'Subnet ID' },
        { id: 'firewallRules', label: 'Firewall Rules' },
      ],
    },
  ],
});

const apiManagementSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'apiManagement.skuName', label: 'SKU' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'apiManagement',
      title: 'API Management',
      fields: [
        { id: 'skuName', label: 'SKU Name' },
        { id: 'gatewayUrl', label: 'Gateway URL' },
        { id: 'publisherEmail', label: 'Publisher Email' },
        { id: 'publicIpIds', label: 'Public IP Resource IDs' },
      ],
    },
  ],
});

const dataFactorySchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [{ id: 'arm.location', label: 'Region' }],
  sections: [
    {
      id: 'dataFactory',
      title: 'Data Factory',
      fields: [
        { id: 'repoConfiguration', label: 'Repo Configuration' },
        { id: 'diagnosticEnabled', label: 'Diagnostics Enabled' },
        { id: 'linkedResourceCount', label: 'Linked Resource Count' },
      ],
    },
  ],
});

const eventGridSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'eventGrid.inputSchema', label: 'Input Schema' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'eventGrid',
      title: 'Event Grid Topic',
      fields: [
        { id: 'endpoint', label: 'Endpoint' },
        { id: 'inputSchema', label: 'Input Schema' },
        { id: 'publicNetworkAccess', label: 'Public Network Access' },
      ],
    },
  ],
});

const eventHubSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'eventHub.skuTier', label: 'SKU Tier' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'eventHub',
      title: 'Event Hubs Namespace',
      fields: [
        { id: 'skuTier', label: 'SKU Tier' },
        { id: 'throughputUnits', label: 'Throughput Units' },
        { id: 'capacity', label: 'Capacity' },
      ],
    },
  ],
});

const logicAppSchema: ResourceSchema = buildResourceSchema({
  statusField: 'logicApp.state',
  metaFields: [
    { id: 'logicApp.state', label: 'State' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'logicApp',
      title: 'Logic App',
      fields: [
        { id: 'state', label: 'State (Enabled/Disabled)' },
        { id: 'endpointUrl', label: 'Endpoint URL' },
        { id: 'integrationAccountId', label: 'Integration Account ID' },
      ],
    },
  ],
});

const serviceBusSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'serviceBus.sku', label: 'SKU' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'serviceBus',
      title: 'Service Bus Namespace',
      fields: [
        { id: 'sku', label: 'SKU' },
        { id: 'queueCount', label: 'Queue Count' },
        { id: 'topicCount', label: 'Topic Count' },
      ],
    },
  ],
});

const automationAccountSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'automation.runbookCount', label: 'Runbook Count' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'automation',
      title: 'Automation Account',
      fields: [
        { id: 'runbookCount', label: 'Runbook Count' },
        { id: 'hybridWorkers', label: 'Hybrid Workers' },
      ],
    },
  ],
});

const azureMonitorSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [{ id: 'arm.location', label: 'Region' }],
  sections: [
    {
      id: 'azureMonitor',
      title: 'Azure Monitor',
      fields: [
        { id: 'metricsEnabled', label: 'Metrics Enabled' },
        { id: 'logCategoriesEnabled', label: 'Log Categories Enabled' },
        { id: 'destinationIds', label: 'Destination Resource IDs' },
      ],
    },
  ],
});

const logAnalyticsWorkspaceSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'logAnalytics.sku', label: 'SKU' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'logAnalytics',
      title: 'Log Analytics Workspace',
      fields: [
        { id: 'sku', label: 'SKU' },
        { id: 'retentionInDays', label: 'Retention (days)' },
        { id: 'dailyQuotaGb', label: 'Daily Quota (GB)' },
      ],
    },
  ],
});

const sentinelWorkspaceSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'sentinel.enabled', label: 'Enabled' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'sentinel',
      title: 'Microsoft Sentinel',
      fields: [
        { id: 'enabled', label: 'Enabled' },
        { id: 'dataConnectorCount', label: 'Data Connector Count' },
        { id: 'analyticsRulesCount', label: 'Analytics Rules Count' },
      ],
    },
  ],
});

const diskSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'managedDisk.diskSizeGb', label: 'Disk Size (GB)' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'managedDisk',
      title: 'Managed Disk',
      fields: [
        { id: 'diskSizeGb', label: 'Disk Size (GB)' },
        { id: 'sku', label: 'SKU' },
        { id: 'encryptionType', label: 'Encryption Type' },
      ],
    },
  ],
});

const functionAppSchema: ResourceSchema = buildResourceSchema({
  statusField: 'runtime.state',
  metaFields: [
    { id: 'runtime.runtimeStack', label: 'Runtime Stack' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'runtime',
      title: 'Function App Runtime',
      fields: [
        { id: 'state', label: 'State', defaultValue: 'Stopped' },
        { id: 'runtimeStack', label: 'Runtime Stack' },
        { id: 'functionVersion', label: 'Function Version' },
        { id: 'appServicePlanId', label: 'App Service Plan ID' },
        { id: 'storageAccountId', label: 'Storage Account ID' },
        { id: 'defaultHostname', label: 'Default Hostname' },
        { id: 'alwaysOn', label: 'Always On' },
      ],
    },
  ],
});

const appServiceSchema: ResourceSchema = buildResourceSchema({
  statusField: 'runtime.state',
  metaFields: [
    { id: 'runtime.kind', label: 'Kind' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'runtime',
      title: 'Runtime',
      fields: [
        { id: 'state', label: 'State', defaultValue: 'Stopped' },
        { id: 'kind', label: 'Kind' },
        { id: 'runtimeStack', label: 'Runtime Stack' },
        { id: 'appServicePlanId', label: 'App Service Plan ID' },
        { id: 'defaultHostname', label: 'Default Hostname' },
        { id: 'httpsOnly', label: 'HTTPS Only' },
        { id: 'dailyUsageQuota', label: 'Daily Usage Quota' },
      ],
    },
    {
      id: 'siteConfig',
      title: 'Site Configuration',
      fields: [
        { id: 'linuxFxVersion', label: 'Linux FX Version' },
        { id: 'windowsFxVersion', label: 'Windows FX Version' },
        { id: 'alwaysOn', label: 'Always On' },
        { id: 'ftpsState', label: 'FTPS State' },
      ],
    },
    {
      id: 'appSettings',
      title: 'App Settings',
      fields: [{ id: 'settings', label: 'App Settings (key=value JSON)' }],
    },
  ],
});

const vmScaleSetSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'scale.sku', label: 'SKU' },
    { id: 'scale.capacity', label: 'Capacity' },
  ],
  sections: [
    {
      id: 'scale',
      title: 'Scale Settings',
      fields: [
        { id: 'sku', label: 'SKU' },
        { id: 'capacity', label: 'Capacity' },
        { id: 'upgradePolicy', label: 'Upgrade Policy' },
        { id: 'orchestrationMode', label: 'Orchestration Mode' },
        { id: 'zones', label: 'Availability Zones' },
      ],
    },
    {
      id: 'networking',
      title: 'Networking',
      fields: [
        { id: 'virtualNetworkId', label: 'Virtual Network ID' },
        { id: 'subnetId', label: 'Subnet ID' },
        {
          id: 'loadBalancerBackendPoolIds',
          label: 'Load Balancer Backend Pools',
        },
        { id: 'healthProbeId', label: 'Health Probe ID' },
      ],
    },
  ],
});

const loadBalancerSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'configuration.sku', label: 'SKU' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'configuration',
      title: 'Load Balancer Configuration',
      fields: [
        { id: 'sku', label: 'SKU' },
        { id: 'frontendIps', label: 'Frontend IPs' },
        { id: 'backendPoolIds', label: 'Backend Pool IDs' },
        { id: 'healthProbes', label: 'Health Probes' },
        { id: 'loadBalancingRules', label: 'Load Balancing Rules' },
      ],
    },
  ],
});

const publicIpSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'ip.ipAddress', label: 'IP Address' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'ip',
      title: 'Public IP',
      fields: [
        { id: 'ipAddress', label: 'IP Address' },
        { id: 'allocationMethod', label: 'Allocation Method' },
        { id: 'sku', label: 'SKU' },
        { id: 'dnsLabel', label: 'DNS Label' },
      ],
    },
  ],
});

const natGatewaySchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [{ id: 'arm.location', label: 'Region' }],
  sections: [
    {
      id: 'gateway',
      title: 'NAT Gateway',
      fields: [
        { id: 'publicIpIds', label: 'Public IP IDs' },
        { id: 'idleTimeoutMinutes', label: 'Idle Timeout (Minutes)' },
      ],
    },
  ],
});

const networkInterfaceSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'nic.privateIpAddress', label: 'Private IP Address' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'nic',
      title: 'Network Interface',
      fields: [
        { id: 'privateIpAddress', label: 'Private IP Address' },
        { id: 'publicIpAddressId', label: 'Public IP Resource ID' },
        { id: 'subnetId', label: 'Subnet ID' },
        { id: 'networkSecurityGroupId', label: 'Network Security Group ID' },
        { id: 'ipConfigurations', label: 'IP Configurations' },
      ],
    },
  ],
});

const bastionSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'bastion.vnetId', label: 'Virtual Network ID' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'bastion',
      title: 'Azure Bastion',
      fields: [
        { id: 'sku', label: 'SKU' },
        { id: 'scaleUnits', label: 'Scale Units' },
        { id: 'vnetId', label: 'Virtual Network ID' },
        { id: 'publicIpAddressId', label: 'Public IP Resource ID' },
      ],
    },
  ],
});

const applicationGatewaySchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'gateway.tier', label: 'Tier' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'gateway',
      title: 'Application Gateway',
      fields: [
        { id: 'tier', label: 'Tier' },
        { id: 'capacity', label: 'Capacity' },
        { id: 'frontendIpConfigs', label: 'Frontend IP Configurations' },
        { id: 'backendPools', label: 'Backend Pools' },
        { id: 'routingRules', label: 'Routing Rules' },
        { id: 'firewallMode', label: 'Firewall Mode' },
      ],
    },
  ],
});

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

const kubernetesClusterSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'controlPlane.kubernetesVersion', label: 'Kubernetes Version' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'controlPlane',
      title: 'Control Plane',
      fields: [
        { id: 'kubernetesVersion', label: 'Kubernetes Version' },
        { id: 'networkPlugin', label: 'Network Plugin' },
        { id: 'networkPolicy', label: 'Network Policy' },
        { id: 'privateCluster', label: 'Private Cluster Enabled' },
        { id: 'identity', label: 'Identity Type' },
      ],
    },
    {
      id: 'nodePools',
      title: 'Node Pools',
      fields: [
        { id: 'systemPoolVmSize', label: 'System Pool VM Size' },
        { id: 'systemPoolCount', label: 'System Pool Node Count' },
        { id: 'userPoolCount', label: 'User Pool Count' },
        { id: 'mode', label: 'Node Pool Mode' },
      ],
    },
  ],
});

const containerInstanceSchema: ResourceSchema = buildResourceSchema({
  statusField: 'configuration.state',
  metaFields: [
    { id: 'configuration.fqdn', label: 'FQDN' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'configuration',
      title: 'Container Group Configuration',
      fields: [
        { id: 'state', label: 'State', defaultValue: 'Stopped' },
        { id: 'osType', label: 'OS Type' },
        { id: 'cpuCores', label: 'CPU Cores' },
        { id: 'memoryGb', label: 'Memory (GB)' },
        { id: 'ipAddressType', label: 'IP Address Type' },
        { id: 'fqdn', label: 'FQDN' },
        { id: 'restartPolicy', label: 'Restart Policy' },
        { id: 'imageName', label: 'Image Name' },
      ],
    },
  ],
});

const batchAccountSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'account.poolCount', label: 'Pool Count' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'account',
      title: 'Batch Account',
      fields: [
        { id: 'poolCount', label: 'Pool Count' },
        { id: 'activeJobs', label: 'Active Jobs' },
        { id: 'autoScaleEnabled', label: 'Auto Scale Enabled' },
        { id: 'privateLinkEnabled', label: 'Private Link Enabled' },
      ],
    },
  ],
});

const virtualNetworkGatewaySchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'gateway.gatewayType', label: 'Gateway Type' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'gateway',
      title: 'Virtual Network Gateway',
      fields: [
        { id: 'gatewayType', label: 'Gateway Type' },
        { id: 'vpnType', label: 'VPN Type' },
        { id: 'enableBgp', label: 'BGP Enabled' },
        { id: 'ipConfigurations', label: 'IP Configurations' },
      ],
    },
  ],
});

const localNetworkGatewaySchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [{ id: 'arm.location', label: 'Region' }],
  sections: [
    {
      id: 'gateway',
      title: 'Local Network Gateway',
      fields: [
        { id: 'gatewayIpAddress', label: 'Gateway IP Address' },
        { id: 'addressPrefixes', label: 'Address Prefixes' },
      ],
    },
  ],
});

const onPremisesNetworkGatewaySchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [{ id: 'arm.location', label: 'Location' }],
  sections: [
    {
      id: 'gateway',
      title: 'On-Premises Network Gateway',
      fields: [
        { id: 'gatewayIpAddress', label: 'Gateway IP Address' },
        { id: 'addressPrefixes', label: 'Address Prefixes' },
        { id: 'bgpAsn', label: 'BGP ASN' },
      ],
    },
  ],
});

const networkSecurityGroupSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'associations.attachedSubnets', label: 'Attached Subnets' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'rules',
      title: 'Security Rules',
      fields: [
        { id: 'securityRules', label: 'Security Rules' },
        { id: 'defaultRules', label: 'Default Rules' },
      ],
    },
    {
      id: 'associations',
      title: 'Associations',
      fields: [
        { id: 'attachedSubnets', label: 'Attached Subnets' },
        { id: 'attachedNics', label: 'Attached NICs' },
      ],
    },
  ],
});

const applicationSecurityGroupSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [{ id: 'arm.location', label: 'Region' }],
  sections: [
    {
      id: 'membership',
      title: 'Application Security Group',
      fields: [{ id: 'memberNics', label: 'Member NICs' }],
    },
  ],
});

const keyVaultSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'settings.sku', label: 'SKU' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'settings',
      title: 'Key Vault Settings',
      fields: [
        { id: 'tenantId', label: 'Tenant ID' },
        { id: 'sku', label: 'SKU' },
        { id: 'softDeleteEnabled', label: 'Soft Delete Enabled' },
        { id: 'publicNetworkAccess', label: 'Public Network Access' },
      ],
    },
  ],
});

const ddosProtectionSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'plan.planType', label: 'Plan Type' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'plan',
      title: 'DDoS Protection Plan',
      fields: [
        { id: 'planId', label: 'Plan Resource ID' },
        { id: 'planType', label: 'Plan Type' },
        { id: 'protectionMode', label: 'Protection Mode' },
      ],
    },
    {
      id: 'coverage',
      title: 'Coverage',
      fields: [
        { id: 'protectedVirtualNetworks', label: 'Protected Virtual Networks' },
        { id: 'protectedPublicIpIds', label: 'Protected Public IPs' },
      ],
    },
  ],
});

const webApplicationFirewallSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'policy.mode', label: 'Mode' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'policy',
      title: 'Web Application Firewall',
      fields: [
        { id: 'mode', label: 'Mode' },
        { id: 'ruleSetVersion', label: 'Rule Set Version' },
        { id: 'customRules', label: 'Custom Rules' },
      ],
    },
  ],
});
const privateEndpointSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [
    { id: 'endpoint.privateIpAddress', label: 'Private IP Address' },
    { id: 'arm.location', label: 'Region' },
  ],
  sections: [
    {
      id: 'endpoint',
      title: 'Private Endpoint',
      fields: [
        { id: 'privateIpAddress', label: 'Private IP Address' },
        { id: 'subnetId', label: 'Subnet ID' },
        { id: 'targetResourceId', label: 'Target Resource ID' },
        { id: 'networkInterfaceId', label: 'Network Interface ID' },
      ],
    },
  ],
});

const routeTableSchema: ResourceSchema = buildResourceSchema({
  statusField: 'arm.provisioningState',
  metaFields: [{ id: 'arm.location', label: 'Region' }],
  sections: [
    {
      id: 'routes',
      title: 'Route Table',
      fields: [
        { id: 'routes', label: 'Routes' },
        { id: 'attachedSubnets', label: 'Attached Subnets' },
      ],
    },
  ],
});

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
