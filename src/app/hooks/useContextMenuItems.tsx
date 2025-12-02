import { useMemo } from 'react';

import { EyeIcon, EditIcon, PlusIcon, SettingsIcon, TrashIcon } from '../../components/icons';
import type { ContextMenuItem } from '../../components/ContextMenu';
import { makeEdgeKey, makeGroupLinkKey } from '../../lib/graph-utils';
import type { ContextMenuState, ConnectionFormState } from '../../types/appState';
import type { GroupLink, NetworkLink } from '../../types/graph';

type UseContextMenuItemsOptions = {
  contextMenu: ContextMenuState | null;
  links: NetworkLink[];
  groupLinks: GroupLink[];
  onAddNodeAtPosition: () => void;
  onClearDrawings: () => void;
  hasDrawings: boolean;
  openProfileWindow: (
    kind: 'node' | 'group',
    resourceId: string,
    options?: { startEditing?: boolean }
  ) => void;
  openConnectionEditorByKey: (linkKey: string, kind: ConnectionFormState['kind']) => void;
  removeConnectionByKey: (linkKey: string) => void;
  removeGroupConnectionByKey: (linkKey: string) => void;
  openGroupEditor: (groupId: string) => void;
  requestGroupRemoval: (groupId: string) => void;
  openNodeEditorById: (nodeId: string) => void;
  requestNodeRemoval: (nodeId: string) => void;
};

export const useContextMenuItems = ({
  contextMenu,
  links,
  groupLinks,
  onAddNodeAtPosition,
  onClearDrawings,
  hasDrawings,
  openProfileWindow,
  openConnectionEditorByKey,
  removeConnectionByKey,
  removeGroupConnectionByKey,
  openGroupEditor,
  requestGroupRemoval,
  openNodeEditorById,
  requestNodeRemoval,
}: UseContextMenuItemsOptions): ContextMenuItem[] => {
  const linkByKey = useMemo(() => {
    const map = new Map<string, NetworkLink>();
    links.forEach((link) => map.set(makeEdgeKey(link), link));
    return map;
  }, [links]);

  const groupLinkByKey = useMemo(() => {
    const map = new Map<string, GroupLink>();
    groupLinks.forEach((link) => map.set(makeGroupLinkKey(link), link));
    return map;
  }, [groupLinks]);

  return useMemo(() => {
    if (!contextMenu) {
      return [];
    }

    if (contextMenu.kind === 'canvas') {
      return [
        {
          id: 'add-node',
          label: 'Add node here',
          icon: <PlusIcon />,
          onSelect: onAddNodeAtPosition,
        },
        ...(hasDrawings
          ? [
              {
                id: 'clear-drawings',
                label: 'Remove all drawings',
                icon: <TrashIcon />,
                tone: 'danger',
                onSelect: onClearDrawings,
              } as ContextMenuItem,
            ]
          : []),
      ];
    }

    if (contextMenu.kind === 'connection') {
      const targetLink = contextMenu.edgeKey ? linkByKey.get(contextMenu.edgeKey) : null;
      const items: ContextMenuItem[] = [];
      if (targetLink) {
        items.push(
          {
            id: 'open-source-node',
            label: 'Open source profile',
            icon: <EyeIcon />,
            onSelect: () => openProfileWindow('node', targetLink.source),
          },
          {
            id: 'open-target-node',
            label: 'Open target profile',
            icon: <EyeIcon />,
            onSelect: () => openProfileWindow('node', targetLink.target),
          }
        );
      }
      items.push(
        {
          id: 'edit-connection',
          label: 'Edit connection',
          icon: <EditIcon />,
          onSelect: () => openConnectionEditorByKey(contextMenu.edgeKey, 'node'),
        },
        {
          id: 'delete-connection',
          label: 'Delete connection',
          icon: <TrashIcon />,
          tone: 'danger',
          onSelect: () => removeConnectionByKey(contextMenu.edgeKey),
        }
      );
      return items;
    }

    if (contextMenu.kind === 'group-connection') {
      const targetLink = contextMenu.linkKey ? groupLinkByKey.get(contextMenu.linkKey) : null;
      const items: ContextMenuItem[] = [];
      if (targetLink) {
        items.push(
          {
            id: 'open-source-group',
            label: 'Open source profile',
            icon: <EyeIcon />,
            onSelect: () => openProfileWindow('group', targetLink.sourceGroupId),
          },
          {
            id: 'open-target-group',
            label: 'Open target profile',
            icon: <EyeIcon />,
            onSelect: () => openProfileWindow('group', targetLink.targetGroupId),
          }
        );
      }
      items.push(
        {
          id: 'edit-group-connection',
          label: 'Edit group link',
          icon: <EditIcon />,
          onSelect: () => openConnectionEditorByKey(contextMenu.linkKey, 'group'),
        },
        {
          id: 'delete-group-connection',
          label: 'Delete group link',
          icon: <TrashIcon />,
          tone: 'danger',
          onSelect: () => removeGroupConnectionByKey(contextMenu.linkKey),
        }
      );
      return items;
    }

    if (contextMenu.kind === 'group') {
      return [
        {
          id: 'open-group-profile',
          label: 'Open profile',
          icon: <EyeIcon />,
          onSelect: () => openProfileWindow('group', contextMenu.groupId),
        },
        {
          id: 'edit-group-profile',
          label: 'Edit profile details',
          icon: <EditIcon />,
          onSelect: () =>
            openProfileWindow('group', contextMenu.groupId, { startEditing: true }),
        },
        {
          id: 'edit-group',
          label: 'Edit group',
          icon: <SettingsIcon />,
          onSelect: () => openGroupEditor(contextMenu.groupId),
        },
        {
          id: 'delete-group',
          label: 'Delete group',
          icon: <TrashIcon />,
          tone: 'danger',
          onSelect: () => requestGroupRemoval(contextMenu.groupId),
        },
      ];
    }

    return [
      {
        id: 'open-node-profile',
        label: 'Open profile',
        icon: <EyeIcon />,
        onSelect: () => openProfileWindow('node', contextMenu.nodeId),
      },
      {
        id: 'edit-node-profile',
        label: 'Edit profile details',
        icon: <EditIcon />,
        onSelect: () => openProfileWindow('node', contextMenu.nodeId, { startEditing: true }),
      },
      {
        id: 'edit-node',
        label: 'Edit node',
        icon: <SettingsIcon />,
        onSelect: () => openNodeEditorById(contextMenu.nodeId),
      },
      {
        id: 'delete-node',
        label: 'Delete node',
        icon: <TrashIcon />,
        tone: 'danger',
        onSelect: () => requestNodeRemoval(contextMenu.nodeId),
      },
    ];
  }, [
    contextMenu,
    groupLinkByKey,
    linkByKey,
    onAddNodeAtPosition,
    onClearDrawings,
    hasDrawings,
    openConnectionEditorByKey,
    openGroupEditor,
    openNodeEditorById,
    openProfileWindow,
    removeConnectionByKey,
    removeGroupConnectionByKey,
    requestGroupRemoval,
    requestNodeRemoval,
  ]);
};
