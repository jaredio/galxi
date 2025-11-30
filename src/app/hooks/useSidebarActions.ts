import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { ContextMenuState } from '../../types/appState';
import type { GroupType } from '../../types/graph';
import type { NodeFormValues } from '../../components/NodeEditorPanel';

type UseSidebarActionsArgs = {
  contextMenu: ContextMenuState | null;
  getGraphCenterPosition: () => { x: number; y: number };
  openCreateNodeForm: (position: { x: number; y: number }, overrides?: Partial<NodeFormValues>) => void;
  openGroupDraft: (groupType: GroupType, position: { x: number; y: number }) => void;
  showUtilityToast: (message: string) => void;
  setWelcomeDismissed: Dispatch<SetStateAction<boolean>>;
  openThemePanel: () => void;
  openSettingsPanel: () => void;
};

export const useSidebarActions = ({
  contextMenu,
  getGraphCenterPosition,
  openCreateNodeForm,
  openGroupDraft,
  showUtilityToast,
  setWelcomeDismissed,
  openThemePanel,
  openSettingsPanel,
}: UseSidebarActionsArgs) => {
  const handleSidebarCreateNode = useCallback(() => {
    const position = getGraphCenterPosition();
    openCreateNodeForm(position);
  }, [getGraphCenterPosition, openCreateNodeForm]);

  const handleSidebarCreateGroup = useCallback(
    (groupType: GroupType) => {
      const center = getGraphCenterPosition();
      openGroupDraft(groupType, center);
    },
    [getGraphCenterPosition, openGroupDraft]
  );

  const handleContextMenuAddNode = useCallback(() => {
    if (!contextMenu || contextMenu.kind !== 'canvas') {
      return;
    }
    openCreateNodeForm({ x: contextMenu.graphX, y: contextMenu.graphY });
  }, [contextMenu, openCreateNodeForm]);

  const handleThemeUtilities = useCallback(() => {
    openThemePanel();
  }, [openThemePanel]);

  const handleSettingsUtilities = useCallback(() => {
    openSettingsPanel();
  }, [openSettingsPanel]);

  const handleEmptyStateCreate = useCallback(() => {
    handleSidebarCreateNode();
    setWelcomeDismissed(true);
  }, [handleSidebarCreateNode, setWelcomeDismissed]);

  return {
    handleSidebarCreateNode,
    handleSidebarCreateGroup,
    handleContextMenuAddNode,
    handleThemeUtilities,
    handleSettingsUtilities,
    handleEmptyStateCreate,
  };
};

export type SidebarActions = ReturnType<typeof useSidebarActions>;
