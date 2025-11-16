import { useMemo } from 'react';
import type { MutableRefObject, MouseEvent as ReactMouseEvent } from 'react';

import type { CanvasViewModel } from '../CanvasView';
import type { ContextMenuItem } from '../../components/ContextMenu';
import type { CanvasGroup, GroupType, NetworkNode } from '../../types/graph';
import type { ContextMenuState } from '../../types/appState';
import type { PanelStateApi } from './usePanelState';
import type { NotificationBannerApi } from './useNotificationBanner';
import type { ProfileWindowsController } from './useProfileWindowsController';

type SidebarModel = {
  onCreateNode: () => void;
  onCreateGroup: (type: GroupType) => void;
  onStartConnection: () => void;
  onOpenTheme: () => void;
  onOpenSettings: () => void;
  onEmptyStateCreate: () => void;
};

type CanvasHandlers = {
  canvasRef: MutableRefObject<SVGSVGElement | null>;
  onCanvasContextMenu: (event: ReactMouseEvent<SVGSVGElement>) => void;
  onCanvasMouseMove: (event: ReactMouseEvent<SVGSVGElement>) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
};

type ContextMenuModel = {
  state: ContextMenuState | null;
  items: ContextMenuItem[];
  onRequestClose: () => void;
};

type UseCanvasViewModelArgs = {
  nodes: NetworkNode[];
  groups: CanvasGroup[];
  welcomeDismissed: boolean;
  sidebar: SidebarModel;
  canvas: CanvasHandlers;
  contextMenu: ContextMenuModel;
  profileWindows: ProfileWindowsController;
  panelState: PanelStateApi;
  notification: NotificationBannerApi;
  requestNodeRemoval: (nodeId: string) => void;
  removeConnectionByKey: (key: string) => void;
  removeGroupConnectionByKey: (key: string) => void;
  handleGroupDelete: () => void;
};

export const useCanvasViewModel = ({
  nodes,
  groups,
  welcomeDismissed,
  sidebar,
  canvas,
  contextMenu,
  profileWindows,
  panelState,
  notification,
  requestNodeRemoval,
  removeConnectionByKey,
  removeGroupConnectionByKey,
  handleGroupDelete,
}: UseCanvasViewModelArgs): CanvasViewModel => {
  const showWelcome = !welcomeDismissed && nodes.length === 0 && groups.length === 0;
  const {
    nodePanel,
    groupPanel,
    connectionPanel,
    panelLayout,
    connectionEditorSourceOpen,
    connectionEditorTargetOpen,
    groupForm,
  } = panelState;
  const {
    profileWindows: profileWindowList,
    profileContext,
    moveProfileWindow,
    closeProfileWindowById,
    focusProfileWindow,
    onProfileFieldChange,
  } = profileWindows;

  return useMemo<CanvasViewModel>(() => {
    return {
      sidebar: {
        onCreateNode: sidebar.onCreateNode,
        onCreateGroup: sidebar.onCreateGroup,
        onStartConnection: sidebar.onStartConnection,
        onOpenTheme: sidebar.onOpenTheme,
        onOpenSettings: sidebar.onOpenSettings,
      },
      canvasRef: canvas.canvasRef,
      onCanvasContextMenu: canvas.onCanvasContextMenu,
      onCanvasMouseMove: canvas.onCanvasMouseMove,
      emptyState: {
        visible: showWelcome,
        onCreateNode: sidebar.onEmptyStateCreate,
      },
      zoom: {
        onZoomIn: canvas.onZoomIn,
        onZoomOut: canvas.onZoomOut,
        onReset: canvas.onResetZoom,
      },
      contextMenu: {
        state: contextMenu.state,
        items: contextMenu.items,
        onRequestClose: contextMenu.onRequestClose,
      },
      profileWindows: {
        windows: profileWindowList,
        nodes,
        groups,
        profileContext,
        onMove: moveProfileWindow,
        onClose: closeProfileWindowById,
        onFocus: focusProfileWindow,
        onFieldChange: onProfileFieldChange,
      },
      nodePanel: {
        ...nodePanel,
        onDeleteNode: requestNodeRemoval,
      },
      connectionPanel: {
        ...connectionPanel,
        handleDelete: (key, kind) =>
          kind === 'node' ? removeConnectionByKey(key) : removeGroupConnectionByKey(key),
        onOpenSourceEndpoint: connectionEditorSourceOpen,
        onOpenTargetEndpoint: connectionEditorTargetOpen,
      },
      groupPanel: {
        ...groupPanel,
        onDelete: groupForm?.mode === 'edit' ? handleGroupDelete : undefined,
      },
      panelLayout,
      utilityToast: notification.utilityToast,
      deletion: {
        pending: notification.pendingDeletion,
        onCancel: notification.cancelPendingDeletion,
        onConfirm: notification.confirmPendingDeletion,
      },
    };
  }, [
    canvas.canvasRef,
    canvas.onCanvasContextMenu,
    canvas.onCanvasMouseMove,
    canvas.onZoomIn,
    canvas.onZoomOut,
    canvas.onResetZoom,
    contextMenu.items,
    contextMenu.onRequestClose,
    contextMenu.state,
    groupPanel,
    groupForm,
    handleGroupDelete,
    nodePanel,
    nodes,
    groups,
    notification.cancelPendingDeletion,
    notification.confirmPendingDeletion,
    notification.pendingDeletion,
    notification.utilityToast,
    panelLayout,
    profileContext,
    profileWindowList,
    onProfileFieldChange,
    moveProfileWindow,
    closeProfileWindowById,
    focusProfileWindow,
    connectionEditorSourceOpen,
    connectionEditorTargetOpen,
    removeConnectionByKey,
    removeGroupConnectionByKey,
    requestNodeRemoval,
    showWelcome,
    sidebar.onCreateNode,
    sidebar.onCreateGroup,
    sidebar.onStartConnection,
    sidebar.onOpenTheme,
    sidebar.onOpenSettings,
    sidebar.onEmptyStateCreate,
    connectionPanel,
    canvas.canvasRef,
    canvas.onCanvasContextMenu,
    canvas.onCanvasMouseMove,
    canvas.onZoomIn,
    canvas.onZoomOut,
    canvas.onResetZoom,
  ]);
};
