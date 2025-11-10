import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  ConnectionDraft,
  ConnectionEditorSelection,
  ConnectionFormState,
  ContextMenuState,
  NodeFormState,
  PendingDeletion,
} from '../types/appState';

type SetState<T> = Dispatch<SetStateAction<T>>;

type UseKeyboardShortcutsOptions = {
  pendingDeletion: PendingDeletion | null;
  cancelPendingDeletion: () => void;
  confirmPendingDeletion: () => void;
  connectionEditorSelection: ConnectionEditorSelection | null;
  connectionForm: ConnectionFormState | null;
  contextMenu: ContextMenuState | null;
  handleContextMenuDismiss: () => void;
  handleConnectionFormSubmit: () => void;
  nodeForm: NodeFormState | null;
  activeNodeId: string | null;
  selectedGroupId: string | null;
  removeConnectionByKey: (key: string) => void;
  removeGroupConnectionByKey: (key: string) => void;
  requestNodeRemoval: (nodeId: string) => void;
  requestGroupRemoval: (groupId: string) => void;
  setConnectionDraft: SetState<ConnectionDraft | null>;
  setConnectionBuilderMode: SetState<boolean>;
  setConnectionForm: SetState<ConnectionFormState | null>;
  setNodeForm: SetState<NodeFormState | null>;
  setActiveNodeId: SetState<string | null>;
  setHoveredNodeId: SetState<string | null>;
  setHoveredEdgeKey: SetState<string | null>;
  setHoveredGroupLinkKey: SetState<string | null>;
  profileWindowCount: number;
  closeTopProfileWindow: () => void;
  onDuplicateActiveNode: () => void;
};

export const useKeyboardShortcuts = ({
  pendingDeletion,
  cancelPendingDeletion,
  confirmPendingDeletion,
  connectionEditorSelection,
  connectionForm,
  contextMenu,
  handleContextMenuDismiss,
  handleConnectionFormSubmit,
  nodeForm,
  activeNodeId,
  selectedGroupId,
  removeConnectionByKey,
  removeGroupConnectionByKey,
  requestNodeRemoval,
  requestGroupRemoval,
  setConnectionDraft,
  setConnectionBuilderMode,
  setConnectionForm,
  setNodeForm,
  setActiveNodeId,
  setHoveredNodeId,
  setHoveredEdgeKey,
  setHoveredGroupLinkKey,
  profileWindowCount,
  closeTopProfileWindow,
  onDuplicateActiveNode,
}: UseKeyboardShortcutsOptions) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (pendingDeletion) {
        if (event.key === 'Escape') {
          event.preventDefault();
          cancelPendingDeletion();
          return;
        }
        if (
          event.key === 'Enter' &&
          !event.shiftKey &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          event.preventDefault();
          confirmPendingDeletion();
        }
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const isEditableElement =
        !!activeElement &&
        (activeElement.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName) ||
          activeElement.getAttribute('role') === 'textbox');
      const hasModifier = event.metaKey || event.ctrlKey || event.altKey;
      if (isEditableElement && !(event.key === 'Escape' && !hasModifier && !event.shiftKey)) {
        return;
      }

      if (event.key === 'Escape') {
        setConnectionDraft(null);
        setConnectionBuilderMode(false);
        if (connectionForm) {
          setConnectionForm(null);
          return;
        }
        if (nodeForm) {
          setNodeForm(null);
          return;
        }
        if (profileWindowCount > 0) {
          event.preventDefault();
          closeTopProfileWindow();
          return;
        }
        if (contextMenu) {
          handleContextMenuDismiss();
          return;
        }
        setActiveNodeId(null);
        setHoveredNodeId(null);
        setHoveredEdgeKey(null);
        setHoveredGroupLinkKey(null);
        return;
      }

      if (connectionForm) {
        if (event.key === 'Delete' && connectionEditorSelection) {
          event.preventDefault();
          if (connectionForm.kind === 'node') {
            removeConnectionByKey(connectionForm.linkKey);
          } else {
            removeGroupConnectionByKey(connectionForm.linkKey);
          }
          return;
        }
        if (
          event.key === 'Enter' &&
          !event.shiftKey &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          event.preventDefault();
          handleConnectionFormSubmit();
        }
        return;
      }

      if (nodeForm) {
        return;
      }

      if (event.key === 'Delete' && activeNodeId) {
        event.preventDefault();
        requestNodeRemoval(activeNodeId);
        return;
      }

      if (event.key === 'Delete' && selectedGroupId) {
        event.preventDefault();
        requestGroupRemoval(selectedGroupId);
        return;
      }

      const isDuplicateShortcut = (event.key === 'd' || event.key === 'D') && event.ctrlKey;
      if (isDuplicateShortcut && activeNodeId) {
        event.preventDefault();
        onDuplicateActiveNode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    pendingDeletion,
    cancelPendingDeletion,
    confirmPendingDeletion,
    connectionEditorSelection,
    connectionForm,
    contextMenu,
    handleContextMenuDismiss,
    handleConnectionFormSubmit,
    nodeForm,
    activeNodeId,
    selectedGroupId,
    removeConnectionByKey,
    removeGroupConnectionByKey,
    requestNodeRemoval,
    requestGroupRemoval,
    setConnectionDraft,
    setConnectionBuilderMode,
    setConnectionForm,
    setNodeForm,
    setActiveNodeId,
    setHoveredNodeId,
    setHoveredEdgeKey,
    setHoveredGroupLinkKey,
    profileWindowCount,
    closeTopProfileWindow,
    onDuplicateActiveNode,
  ]);
};
