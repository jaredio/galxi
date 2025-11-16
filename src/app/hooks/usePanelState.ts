import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Dispatch,
  FormEvent,
  MutableRefObject,
  SetStateAction,
} from 'react';

import { usePanelLayout } from '../../hooks/usePanelLayout';
import { makeGroupLinkKey, makeLinkKey } from '../../lib/graph-utils';
import { applyParentAssignments } from '../../lib/groupParenting';
import { sanitizeInput, validateGroupTitle, validateLabel, validateRelation } from '../../lib/validation';
import { sanitizeProfileFieldValue } from '../../lib/profileField';
import {
  createDefaultGroupProfile,
  createDefaultNodeProfile,
  getGroupProfileSchema,
  getNodeProfileSchema,
  mergeProfileWithSchema,
} from '../../schemas/resources';
import type { NodeConnection, NodeFormValues } from '../../components/NodeEditorPanel';
import type {
  CanvasGroup,
  GroupLink,
  GroupPositionMap,
  GroupType,
  NetworkLink,
  NetworkNode,
  NodePositionMap,
  NodeType,
} from '../../types/graph';
import type { ProfileFormSection, ResourceProfileData } from '../../types/profile';
import type {
  ConnectionDraft,
  ConnectionEditorSelection,
  ConnectionFormState,
  ContextMenuState,
  GroupFormState,
  GroupFormValues,
  NodeFormState,
} from '../../types/appState';

type GroupDraftType = GroupType;

const groupDraftPresets: Record<GroupDraftType, { title: string }> = {
  virtualNetwork: { title: 'New Virtual Network' },
  subnet: { title: 'New Subnet' },
  logicalGroup: { title: 'New Logical Group' },
};

type UsePanelStateOptions = {
  nodes: NetworkNode[];
  links: NetworkLink[];
  groups: CanvasGroup[];
  groupLinks: GroupLink[];
  setNodes: Dispatch<SetStateAction<NetworkNode[]>>;
  setLinks: Dispatch<SetStateAction<NetworkLink[]>>;
  setGroups: Dispatch<SetStateAction<CanvasGroup[]>>;
  setGroupLinks: Dispatch<SetStateAction<GroupLink[]>>;
  nodePositionsRef: MutableRefObject<NodePositionMap>;
  groupPositionsRef: MutableRefObject<GroupPositionMap>;
  assignNodeToGroupByPosition: (nodeId: string, position?: { x: number; y: number }) => void;
  setActiveNodeId: Dispatch<SetStateAction<string | null>>;
  setHoveredNodeId: Dispatch<SetStateAction<string | null>>;
  setHoveredEdgeKey: Dispatch<SetStateAction<string | null>>;
  setHoveredGroupLinkKey: Dispatch<SetStateAction<string | null>>;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  setSelectedGroupId: Dispatch<SetStateAction<string | null>>;
  setHoveredGroupId: Dispatch<SetStateAction<string | null>>;
  setConnectionDraft: Dispatch<SetStateAction<ConnectionDraft | null>>;
  closeProfileWindowsByResource: (kind: 'node' | 'group', resourceId: string) => void;
  showUtilityToast: (message: string) => void;
  handleContextMenuDismiss: () => void;
  createNodeId: () => string;
  createGroupId: () => string;
  connectionSyncRef: MutableRefObject<{
    kind: ConnectionFormState['kind'];
    key: string;
    relation: string;
  } | null>;
};

export const usePanelState = ({
  nodes,
  links,
  groups,
  groupLinks,
  setNodes,
  setLinks,
  setGroups,
  setGroupLinks,
  nodePositionsRef,
  groupPositionsRef,
  assignNodeToGroupByPosition,
  setActiveNodeId,
  setHoveredNodeId,
  setHoveredEdgeKey,
  setHoveredGroupLinkKey,
  setContextMenu,
  setSelectedGroupId,
  setHoveredGroupId,
  setConnectionDraft,
  closeProfileWindowsByResource,
  showUtilityToast,
  handleContextMenuDismiss,
  createNodeId,
  createGroupId,
  connectionSyncRef,
}: UsePanelStateOptions) => {
  const [nodeForm, setNodeForm] = useState<NodeFormState | null>(null);
  const [nodeFormValues, setNodeFormValues] = useState<NodeFormValues>({
    label: '',
    type: 'vm',
    group: '',
  });
  const [nodeProfileDraft, setNodeProfileDraft] = useState<ResourceProfileData>(() =>
    createDefaultNodeProfile('vm')
  );
  const [groupForm, setGroupForm] = useState<GroupFormState | null>(null);
  const [groupFormValues, setGroupFormValues] = useState<GroupFormValues>({
    title: '',
    type: 'virtualNetwork',
  });
  const [groupProfileDraft, setGroupProfileDraft] = useState<ResourceProfileData>(() =>
    createDefaultGroupProfile('virtualNetwork')
  );
  const [groupDraft, setGroupDraft] = useState<CanvasGroup | null>(null);
  const [connectionForm, setConnectionForm] = useState<ConnectionFormState | null>(null);

  const {
    panelGeometry,
    panelExpanded,
    collapsePanel,
    ensurePanelVisible,
    handlePanelMove,
    handlePanelResize,
    handlePanelToggleExpand,
  } = usePanelLayout();

  useEffect(() => {
    if (!nodeForm || nodeForm.mode !== 'edit') {
      return;
    }
    const currentNode = nodes.find((node) => node.id === nodeForm.nodeId);
    if (!currentNode) {
      return;
    }
    const normalizedGroup = currentNode.group ?? '';
    setNodeFormValues((prev) => (prev.group === normalizedGroup ? prev : { ...prev, group: normalizedGroup }));
  }, [nodeForm, nodes]);

  useEffect(() => {
    if (!groupForm) {
      return;
    }
    const target = groups.find((group) => group.id === groupForm.groupId);
    if (!target) {
      return;
    }
    setGroupFormValues({ title: target.title, type: target.type });
  }, [groupForm, groups]);

  const updateGroupById = useCallback(
    (groupId: string, updater: (group: CanvasGroup) => CanvasGroup) => {
      setGroups((prev) => applyParentAssignments(prev.map((group) => (group.id === groupId ? updater(group) : group))));
    },
    [setGroups]
  );

  const handleLabelChange = useCallback((value: string) => {
    setNodeFormValues((prev) => ({ ...prev, label: value }));
  }, []);

  const handleTypeChange = useCallback((value: NodeFormValues['type']) => {
    setNodeFormValues((prev) => ({ ...prev, type: value }));
    setNodeProfileDraft(createDefaultNodeProfile(value));
  }, []);

  const handleNodeProfileFieldChange = useCallback((fieldKey: string, value: string) => {
    const nextValue = sanitizeProfileFieldValue(value);
    if (nextValue === null) {
      return;
    }
    setNodeProfileDraft((prev) => {
      if (prev[fieldKey] === nextValue) {
        return prev;
      }
      return { ...prev, [fieldKey]: nextValue };
    });
  }, []);

  const handleGroupTitleChange = useCallback((value: string) => {
    setGroupFormValues((prev) => ({ ...prev, title: value }));
  }, []);

  const handleGroupTypeChange = useCallback((value: GroupType) => {
    setGroupFormValues((prev) => ({ ...prev, type: value }));
    setGroupProfileDraft((prev: ResourceProfileData) =>
      mergeProfileWithSchema(getGroupProfileSchema(value), prev)
    );
  }, []);

  const handleGroupProfileFieldChange = useCallback((fieldKey: string, value: string) => {
    const nextValue = sanitizeProfileFieldValue(value);
    if (nextValue === null) {
      return;
    }
    setGroupProfileDraft((prev: ResourceProfileData) => {
      if (prev[fieldKey] === nextValue) {
        return prev;
      }
      return { ...prev, [fieldKey]: nextValue };
    });
  }, []);

  const openNodeEditorById = useCallback(
    (nodeId: string) => {
      const target = nodes.find((candidate) => candidate.id === nodeId);
      if (!target) {
        return;
      }
      setNodeFormValues({
        label: target.label,
        type: target.type,
        group: target.group,
      });
      setNodeProfileDraft(
        mergeProfileWithSchema(
          getNodeProfileSchema(target.type),
          target.profile ?? createDefaultNodeProfile(target.type)
        )
      );
      setNodeForm({
        mode: 'edit',
        nodeId,
      });
      setConnectionForm(null);
      setActiveNodeId(nodeId);
      setHoveredNodeId(nodeId);
      setContextMenu(null);
      ensurePanelVisible();
      setSelectedGroupId(null);
      setGroupForm(null);
      setHoveredGroupId(null);
    },
    [nodes, ensurePanelVisible, setActiveNodeId, setHoveredNodeId, setContextMenu, setSelectedGroupId, setHoveredGroupId]
  );

  const openCreateNodeForm = useCallback(
    (position: { x: number; y: number }, overrides?: Partial<NodeFormValues>) => {
      const nextType = overrides?.type ?? 'vm';
      setNodeFormValues({
        label: overrides?.label ?? 'New Node',
        type: nextType,
        group: overrides?.group ?? '',
      });
      setNodeProfileDraft(createDefaultNodeProfile(nextType));
      setNodeForm({
        mode: 'create',
        position,
      });
      handleContextMenuDismiss();
      setConnectionForm(null);
      setSelectedGroupId(null);
      setHoveredGroupId(null);
      setGroupForm(null);
      collapsePanel();
    },
    [collapsePanel, handleContextMenuDismiss, setSelectedGroupId, setHoveredGroupId]
  );

  const removeNodeById = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((node) => node.id !== nodeId));
      setLinks((prev) => prev.filter((link) => link.source !== nodeId && link.target !== nodeId));
      setConnectionDraft((current) => {
        if (current?.kind === 'node' && current.sourceNodeId === nodeId) {
          return null;
        }
        return current;
      });
      setNodeForm((current) => {
        if (current && current.mode === 'edit' && current.nodeId === nodeId) {
          return null;
        }
        return current;
      });
      delete nodePositionsRef.current[nodeId];
      setActiveNodeId((current) => (current === nodeId ? null : current));
      setHoveredNodeId((current) => (current === nodeId ? null : current));
      setHoveredEdgeKey(null);
      setHoveredGroupLinkKey(null);
      setContextMenu(null);
      setConnectionForm(null);
      closeProfileWindowsByResource('node', nodeId);
    },
    [
      closeProfileWindowsByResource,
      nodePositionsRef,
      setActiveNodeId,
      setConnectionDraft,
      setConnectionForm,
      setContextMenu,
      setHoveredEdgeKey,
      setHoveredGroupLinkKey,
      setHoveredNodeId,
      setLinks,
      setNodes,
    ]
  );

  const removeConnectionByKey = useCallback(
    (edgeKey: string) => {
      setLinks((prev) => prev.filter((link) => makeLinkKey(link) !== edgeKey));
      setHoveredEdgeKey((current) => (current === edgeKey ? null : current));
      setConnectionForm((current) => (current?.kind === 'node' && current.linkKey === edgeKey ? null : current));
      setContextMenu((current) => {
        if (current && current.kind === 'connection' && current.edgeKey === edgeKey) {
          return null;
        }
        return current;
      });
    },
    [setLinks, setHoveredEdgeKey, setConnectionForm, setContextMenu]
  );

  const removeGroupConnectionByKey = useCallback(
    (linkKey: string) => {
      setGroupLinks((prev) => prev.filter((link) => makeGroupLinkKey(link) !== linkKey));
      setHoveredGroupLinkKey((current) => (current === linkKey ? null : current));
      setConnectionForm((current) =>
        current?.kind === 'group' && current.linkKey === linkKey ? null : current
      );
      setContextMenu((current) => {
        if (current && current.kind === 'group-connection' && current.linkKey === linkKey) {
          return null;
        }
        return current;
      });
    },
    [setGroupLinks, setHoveredGroupLinkKey, setConnectionForm, setContextMenu]
  );

  const removeGroupById = useCallback(
    (groupId: string) => {
      setGroups((prev) => applyParentAssignments(prev.filter((group) => group.id !== groupId)));
      setSelectedGroupId((current) => (current === groupId ? null : current));
      setHoveredGroupId((current) => (current === groupId ? null : current));
      setGroupForm((current) => (current && current.groupId === groupId ? null : current));
      setGroupLinks((prev) =>
        prev.filter((link) => link.sourceGroupId !== groupId && link.targetGroupId !== groupId)
      );
      setNodes((prev) =>
        prev.map((node) => (node.group === groupId ? { ...node, group: '' } : node))
      );
      setConnectionDraft((current) => {
        if (current?.kind === 'group' && current.sourceGroupId === groupId) {
          return null;
        }
        return current;
      });
      setHoveredGroupLinkKey(null);
      delete groupPositionsRef.current[groupId];
      setContextMenu((current) => {
        if (current && current.kind === 'group' && current.groupId === groupId) {
          return null;
        }
        return current;
      });
      closeProfileWindowsByResource('group', groupId);
    },
    [
      closeProfileWindowsByResource,
      groupPositionsRef,
      setConnectionDraft,
      setContextMenu,
      setGroupForm,
      setGroupLinks,
      setGroups,
      setHoveredGroupId,
      setHoveredGroupLinkKey,
      setNodes,
      setSelectedGroupId,
    ]
  );

  const openGroupEditor = useCallback(
    (groupId: string, mode: GroupFormState['mode'] = 'edit') => {
      const target = groups.find((group) => group.id === groupId);
      if (!target) {
        return;
      }
      setGroupFormValues({ title: target.title, type: target.type });
      setGroupProfileDraft(
        mergeProfileWithSchema(
          getGroupProfileSchema(target.type),
          target.profile ?? createDefaultGroupProfile(target.type)
        )
      );
      setGroupForm({ mode, groupId });
      setSelectedGroupId(groupId);
      setActiveNodeId(null);
      setNodeForm(null);
      setConnectionForm(null);
      setContextMenu(null);
      ensurePanelVisible();
    },
    [groups, ensurePanelVisible, setSelectedGroupId, setActiveNodeId, setContextMenu]
  );

  const openGroupDraft = useCallback(
    (groupType: GroupDraftType, position: { x: number; y: number }) => {
      const preset = groupDraftPresets[groupType];
      const width = 360;
      const height = 240;
      const id = createGroupId();
      const nextGroup: CanvasGroup = {
        id,
        type: groupType,
        title: preset.title,
        x: position.x - width / 2,
        y: position.y - height / 2,
        width,
        height,
        profile: createDefaultGroupProfile(groupType),
      };
      setGroupDraft(nextGroup);
      setHoveredGroupId(null);
      setGroupFormValues({ title: nextGroup.title, type: groupType });
      setGroupProfileDraft(createDefaultGroupProfile(groupType));
      setGroupForm({ mode: 'create', groupId: id });
      setNodeForm(null);
      setConnectionForm(null);
      setContextMenu(null);
      ensurePanelVisible();
    },
    [createGroupId, ensurePanelVisible, setHoveredGroupId, setContextMenu]
  );

  const handleNodeFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!nodeForm) {
        return;
      }
      const labelResult = validateLabel(nodeFormValues.label);
      if (!labelResult.valid || !labelResult.value) {
        showUtilityToast(labelResult.error ?? 'Enter a node name to continue.');
        return;
      }
      const label = labelResult.value;
      const group = sanitizeInput(nodeFormValues.group, 100);

      const schema = getNodeProfileSchema(nodeFormValues.type);
      const profile = mergeProfileWithSchema(schema, nodeProfileDraft);

      if (nodeForm.mode === 'create') {
        const newId = createNodeId();
        nodePositionsRef.current[newId] = { ...nodeForm.position };
        setNodes((prev) => [
          ...prev,
          {
            id: newId,
            label,
            type: nodeFormValues.type,
            group,
            profile,
          },
        ]);
        setActiveNodeId(newId);
        setHoveredNodeId(newId);
        setHoveredEdgeKey(null);
        assignNodeToGroupByPosition(newId, nodeForm.position);
      } else if (nodeForm.mode === 'edit' && nodeForm.nodeId) {
        setNodes((prev) =>
          prev.map((node) =>
            node.id === nodeForm.nodeId
              ? {
                  ...node,
                  label,
                  type: nodeFormValues.type,
                  group,
                  profile,
                }
              : node
          )
        );
      }

      setNodeForm(null);
      setNodeProfileDraft(createDefaultNodeProfile('vm'));
    },
    [
      assignNodeToGroupByPosition,
      createNodeId,
      nodeForm,
      nodeFormValues,
      nodeProfileDraft,
      nodePositionsRef,
      setActiveNodeId,
      setHoveredEdgeKey,
      setHoveredNodeId,
      setNodes,
      showUtilityToast,
    ]
  );

  const handleNodeFormClose = useCallback(() => {
    setNodeForm(null);
    setNodeProfileDraft(createDefaultNodeProfile('vm'));
  }, []);

  const handleGroupFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!groupForm) {
        return;
      }
      const titleResult = validateGroupTitle(groupFormValues.title);
      if (!titleResult.valid || !titleResult.value) {
        showUtilityToast(titleResult.error ?? 'Enter a group name to continue.');
        return;
      }
      const title = titleResult.value;
      const schema = getGroupProfileSchema(groupFormValues.type);
      const mergedProfile = mergeProfileWithSchema(schema, groupProfileDraft);
      if (groupForm.mode === 'create') {
        if (!groupDraft || groupDraft.id !== groupForm.groupId) {
          return;
        }
        const newGroup: CanvasGroup = {
          ...groupDraft,
          title,
          type: groupFormValues.type,
          profile: mergedProfile,
        };
        setGroups((prev) => applyParentAssignments([...prev, newGroup]));
        setGroupDraft(null);
        setGroupForm(null);
        setGroupProfileDraft(createDefaultGroupProfile('virtualNetwork'));
        return;
      }
      updateGroupById(groupForm.groupId, (group) => ({
        ...group,
        title,
        type: groupFormValues.type,
        profile: mergedProfile,
      }));
      setGroupForm(null);
      setGroupProfileDraft(createDefaultGroupProfile('virtualNetwork'));
    },
    [
      groupDraft,
      groupForm,
      groupFormValues,
      groupProfileDraft,
      setGroups,
      showUtilityToast,
      updateGroupById,
    ]
  );

  const handleGroupFormClose = useCallback(() => {
    if (groupForm?.mode === 'create') {
      setGroupDraft(null);
    }
    setGroupForm(null);
    setGroupProfileDraft(createDefaultGroupProfile('virtualNetwork'));
  }, [groupForm]);

  const nodeFormType = useMemo<NodeType>(() => {
    if (!nodeForm) {
      return nodeFormValues.type;
    }
    if (nodeForm.mode === 'create') {
      return nodeFormValues.type;
    }
    const existing = nodes.find((node) => node.id === nodeForm.nodeId);
    return existing?.type ?? nodeFormValues.type;
  }, [nodeForm, nodeFormValues.type, nodes]);

  const nodeProfileSchema = useMemo(() => getNodeProfileSchema(nodeFormType), [nodeFormType]);
  const nodeProfileSections = useMemo(
    () =>
      nodeProfileSchema.sections.map((section) => ({
        id: section.id,
        title: section.title,
        fields: section.fields.map((field) => ({
          id: field.id,
          label: field.label,
          key: `${section.id}.${field.id}`,
        })),
      })),
    [nodeProfileSchema]
  );

  const groupProfileSchema = useMemo(() => getGroupProfileSchema(groupFormValues.type), [groupFormValues.type]);
  const groupProfileSections = useMemo<ProfileFormSection[]>(
    () =>
      groupProfileSchema.sections.map((section) => ({
        id: section.id,
        title: section.title,
        fields: section.fields.map((field) => ({
          id: field.id,
          label: field.label,
          key: `${section.id}.${field.id}`,
        })),
      })),
    [groupProfileSchema]
  );

  const nodeEditorConnections = useMemo<NodeConnection[]>(() => {
    if (!nodeForm || nodeForm.mode !== 'edit') {
      return [];
    }
    const nodeId = nodeForm.nodeId;
    return links
      .filter((link) => link.source === nodeId || link.target === nodeId)
      .map((link) => {
        const direction = link.source === nodeId ? 'outgoing' : 'incoming';
        const peerId = direction === 'outgoing' ? link.target : link.source;
        const peerLabel = nodes.find((node) => node.id === peerId)?.label ?? peerId;
        return {
          key: makeLinkKey(link),
          direction,
          peerLabel,
          relation: link.relation,
        };
      });
  }, [nodeForm, links, nodes]);

  const handleConnectionRelationChange = useCallback(
    (key: string, relation: string) => {
      const result = validateRelation(relation);
      const value = result.value ?? '';
      setLinks((prev) =>
        prev.map((link) => (makeLinkKey(link) === key ? { ...link, relation: value } : link))
      );
    },
    [setLinks]
  );

  const handleConnectionRemove = useCallback(
    (key: string) => {
      removeConnectionByKey(key);
    },
    [removeConnectionByKey]
  );

  const connectionEditorSelection = useMemo<ConnectionEditorSelection | null>(() => {
    if (!connectionForm) {
      return null;
    }
    if (connectionForm.kind === 'node') {
      const link = links.find((candidate) => makeLinkKey(candidate) === connectionForm.linkKey);
      if (!link) {
        return null;
      }
      const source = nodes.find((node) => node.id === link.source);
      const target = nodes.find((node) => node.id === link.target);
      return {
        kind: 'node',
        key: makeLinkKey(link),
        relation: link.relation,
        source: source ? { kind: 'node', id: source.id, label: source.label, type: source.type } : null,
        target: target ? { kind: 'node', id: target.id, label: target.label, type: target.type } : null,
      };
    }
    const link = groupLinks.find((candidate) => makeGroupLinkKey(candidate) === connectionForm.linkKey);
    if (!link) {
      return null;
    }
    const source = groups.find((group) => group.id === link.sourceGroupId);
    const target = groups.find((group) => group.id === link.targetGroupId);
    return {
      kind: 'group',
      key: makeGroupLinkKey(link),
      relation: link.relation,
      source: source ? { kind: 'group', id: source.id, label: source.title, type: source.type } : null,
      target: target ? { kind: 'group', id: target.id, label: target.title, type: target.type } : null,
    };
  }, [connectionForm, groupLinks, groups, links, nodes]);

  useEffect(() => {
    if (!connectionEditorSelection) {
      connectionSyncRef.current = null;
      return;
    }
    const nextSignature = {
      kind: connectionEditorSelection.kind,
      key: connectionEditorSelection.key,
      relation: connectionEditorSelection.relation,
    };
    const previousSignature = connectionSyncRef.current;
    if (
      previousSignature &&
      previousSignature.kind === nextSignature.kind &&
      previousSignature.key === nextSignature.key &&
      previousSignature.relation === nextSignature.relation
    ) {
      return;
    }
    connectionSyncRef.current = nextSignature;
    setConnectionForm((current) => {
      if (
        !current ||
        current.kind !== nextSignature.kind ||
        current.linkKey !== nextSignature.key ||
        current.relation === nextSignature.relation
      ) {
        return current;
      }
      return { ...current, relation: nextSignature.relation };
    });
  }, [connectionEditorSelection]);

  const connectionEditorSourceOpen = useMemo<(() => void) | undefined>(() => {
    const source = connectionEditorSelection?.source;
    if (!source) {
      return undefined;
    }
    if (source.kind === 'node') {
      const { id } = source;
      return () => openNodeEditorById(id);
    }
    const { id } = source;
    return () => openGroupEditor(id);
  }, [connectionEditorSelection, openGroupEditor, openNodeEditorById]);

  const connectionEditorTargetOpen = useMemo<(() => void) | undefined>(() => {
    const target = connectionEditorSelection?.target;
    if (!target) {
      return undefined;
    }
    if (target.kind === 'node') {
      const { id } = target;
      return () => openNodeEditorById(id);
    }
    const { id } = target;
    return () => openGroupEditor(id);
  }, [connectionEditorSelection, openGroupEditor, openNodeEditorById]);

  const openConnectionEditorByKey = useCallback(
    (linkKey: string, kind: ConnectionFormState['kind']) => {
      if (kind === 'node') {
        const target = links.find((link) => makeLinkKey(link) === linkKey);
        if (!target) {
          return;
        }
        setNodeForm(null);
        setConnectionForm({
          mode: 'edit',
          kind: 'node',
          linkKey,
          relation: target.relation,
        });
        setHoveredGroupLinkKey(null);
        setHoveredEdgeKey(linkKey);
      } else {
        const target = groupLinks.find((link) => makeGroupLinkKey(link) === linkKey);
        if (!target) {
          return;
        }
        setGroupForm(null);
        setConnectionForm({
          mode: 'edit',
          kind: 'group',
          linkKey,
          relation: target.relation,
        });
        setHoveredEdgeKey(null);
        setHoveredGroupLinkKey(linkKey);
      }
      handleContextMenuDismiss();
      collapsePanel();
    },
    [groupLinks, handleContextMenuDismiss, links, collapsePanel, setHoveredEdgeKey, setHoveredGroupLinkKey]
  );

  const handleConnectionFormRelationChange = useCallback((value: string) => {
    const result = validateRelation(value);
    const nextValue = result.value ?? '';
    setConnectionForm((current) => (current ? { ...current, relation: nextValue } : current));
  }, []);

  const handleConnectionFormClose = useCallback(() => {
    const selection = connectionEditorSelection;
    setConnectionForm(null);
    if (!selection || selection.relation.trim().length > 0) {
      return;
    }
    if (selection.kind === 'node') {
      removeConnectionByKey(selection.key);
    } else {
      removeGroupConnectionByKey(selection.key);
    }
  }, [connectionEditorSelection, removeConnectionByKey, removeGroupConnectionByKey]);

  const handleConnectionFormSubmit = useCallback(() => {
    setConnectionForm((current) => {
      if (!current) {
        return current;
      }
      const nextRelation = current.relation.trim();
      if (nextRelation.length === 0) {
        showUtilityToast('Relation name is required.');
        return current;
      }
      if (current.kind === 'node') {
        setLinks((prev) =>
          prev.map((link) =>
            makeLinkKey(link) === current.linkKey ? { ...link, relation: nextRelation } : link
          )
        );
      } else {
        setGroupLinks((prev) =>
          prev.map((link) =>
            makeGroupLinkKey(link) === current.linkKey ? { ...link, relation: nextRelation } : link
          )
        );
      }
      return null;
    });
  }, [setLinks, setGroupLinks, showUtilityToast]);

  return {
    nodeForm,
    groupForm,
    connectionForm,
    nodePanel: {
      form: nodeForm,
      values: nodeFormValues,
      nodeType: nodeFormType,
      onLabelChange: handleLabelChange,
      onTypeChange: handleTypeChange,
      onClose: handleNodeFormClose,
      onSubmit: handleNodeFormSubmit,
      profileDraft: nodeProfileDraft,
      profileSections: nodeProfileSections,
      onProfileFieldChange: handleNodeProfileFieldChange,
      connections: nodeEditorConnections,
      onConnectionRelationChange: handleConnectionRelationChange,
      onConnectionRemove: handleConnectionRemove,
    },
    groupPanel: {
      form: groupForm,
      values: groupFormValues,
      onTitleChange: handleGroupTitleChange,
      onTypeChange: handleGroupTypeChange,
      onClose: handleGroupFormClose,
      onSubmit: handleGroupFormSubmit,
      profileDraft: groupProfileDraft,
      profileSections: groupProfileSections,
      onProfileFieldChange: handleGroupProfileFieldChange,
    },
    connectionPanel: {
      form: connectionForm,
      selection: connectionEditorSelection,
      onRelationChange: handleConnectionFormRelationChange,
      onSubmit: handleConnectionFormSubmit,
      onClose: handleConnectionFormClose,
    },
    panelLayout: {
      geometry: panelGeometry,
      expanded: panelExpanded,
      onMove: handlePanelMove,
      onResize: handlePanelResize,
      onToggleExpand: handlePanelToggleExpand,
    },
    nodeEditorConnections,
    connectionEditorSelection,
    connectionEditorSourceOpen,
    connectionEditorTargetOpen,
    openNodeEditorById,
    openGroupEditor,
    openCreateNodeForm,
    openGroupDraft,
    openConnectionEditorByKey,
    removeConnectionByKey,
    removeGroupConnectionByKey,
    removeNodeById,
    removeGroupById,
    setNodeForm,
    setGroupForm,
    setConnectionForm,
    collapsePanel,
  };
};

export type PanelStateApi = ReturnType<typeof usePanelState>;
