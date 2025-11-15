import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { MutableRefObject } from 'react';

import { GalxiSidebar } from '../components/GalxiSidebar';
import { EmptyState } from '../components/EmptyState';
import { ZoomControls } from '../components/ZoomControls';
import { ContextMenu, type ContextMenuItem } from '../components/ContextMenu';
import { ProfileWindow } from '../components/ProfileWindow';
import { NodeEditorPanel, type NodeConnection, type NodeFormValues } from '../components/NodeEditorPanel';
import { ConnectionEditorPanel } from '../components/ConnectionEditorPanel';
import { GroupEditorPanel } from '../components/GroupEditorPanel';
import { nodeTypeOptions } from '../constants/nodeOptions';
import { buildGroupProfileContent, buildNodeProfileContent } from '../lib/profileData';
import type { ProfileFormSection, ResourceProfileData } from '../types/profile';
import type {
  CanvasGroup,
  GroupLink,
  GroupType,
  NetworkLink,
  NetworkNode,
  NodeType,
} from '../types/graph';
import type {
  ConnectionEditorSelection,
  ConnectionFormState,
  ContextMenuState,
  GroupFormState,
  GroupFormValues,
  NodeFormState,
  PendingDeletion,
  ProfileWindowState,
} from '../types/appState';

type ProfileContext = {
  nodes: NetworkNode[];
  groups: CanvasGroup[];
  links: NetworkLink[];
  groupLinks: GroupLink[];
};

export type CanvasViewModel = {
  sidebar: {
    onCreateNode: () => void;
    onCreateGroup: (type: GroupType) => void;
    onStartConnection: () => void;
    onOpenTheme: () => void;
    onOpenSettings: () => void;
  };
  canvasRef: MutableRefObject<SVGSVGElement | null>;
  onCanvasContextMenu: (event: ReactMouseEvent<SVGSVGElement>) => void;
  onCanvasMouseMove: (event: ReactMouseEvent<SVGSVGElement>) => void;
  emptyState: {
    visible: boolean;
    onCreateNode: () => void;
  };
  zoom: {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
  };
  contextMenu: {
    state: ContextMenuState | null;
    items: ContextMenuItem[];
    onRequestClose: () => void;
  };
  profileWindows: {
    windows: ProfileWindowState[];
    nodes: NetworkNode[];
    groups: CanvasGroup[];
    profileContext: ProfileContext;
    onMove: (id: string, position: { x: number; y: number }) => void;
    onClose: (id: string) => void;
    onFocus: (id: string) => void;
    onFieldChange: (
      kind: ProfileWindowState['kind'],
      resourceId: string,
      fieldKey: string,
      value: string
    ) => void;
  };
  nodePanel: {
    form: NodeFormState | null;
    values: NodeFormValues;
    nodeType: NodeType;
    onLabelChange: (value: string) => void;
    onTypeChange: (value: NodeType) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onDeleteNode: (nodeId: string) => void;
    profileDraft: ResourceProfileData;
    profileSections: ProfileFormSection[];
    onProfileFieldChange: (fieldKey: string, value: string) => void;
    connections: NodeConnection[];
    onConnectionRelationChange: (key: string, relation: string) => void;
    onConnectionRemove: (key: string) => void;
  };
  connectionPanel: {
    form: ConnectionFormState | null;
    selection: ConnectionEditorSelection | null;
    onRelationChange: (value: string) => void;
    onSubmit: () => void;
    onClose: () => void;
    handleDelete: (linkKey: string, kind: ConnectionFormState['kind']) => void;
    onOpenSourceEndpoint?: () => void;
    onOpenTargetEndpoint?: () => void;
  };
  groupPanel: {
    form: GroupFormState | null;
    values: GroupFormValues;
    onTitleChange: (value: string) => void;
    onTypeChange: (value: GroupType) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onDelete?: () => void;
    profileDraft: ResourceProfileData;
    profileSections: ProfileFormSection[];
    onProfileFieldChange: (fieldKey: string, value: string) => void;
  };
  panelLayout: {
    geometry: { x: number; y: number; width: number; height: number };
    expanded: boolean;
    onMove: (position: { x: number; y: number }) => void;
    onResize: (geometry: { x: number; y: number; width: number; height: number }) => void;
    onToggleExpand: () => void;
  };
  utilityToast: { message: string } | null;
  deletion: {
    pending: PendingDeletion | null;
    onCancel: () => void;
    onConfirm: () => void;
  };
};

type CanvasViewProps = {
  model: CanvasViewModel;
};

export const CanvasView = ({ model }: CanvasViewProps) => {
  const {
    sidebar,
    canvasRef,
    onCanvasContextMenu,
    onCanvasMouseMove,
    emptyState,
    zoom,
    contextMenu,
    profileWindows,
    nodePanel,
    connectionPanel,
    groupPanel,
    panelLayout,
    utilityToast,
    deletion,
  } = model;

  const connectionForm = connectionPanel.form;
  const connectionSelection = connectionPanel.selection;
  const showConnectionPanel = !nodePanel.form && connectionForm && connectionSelection;

  return (
    <>
      <GalxiSidebar
        onCreateNode={sidebar.onCreateNode}
        onCreateGroup={sidebar.onCreateGroup}
        onStartConnection={sidebar.onStartConnection}
        onOpenTheme={sidebar.onOpenTheme}
        onOpenSettings={sidebar.onOpenSettings}
      />

      <main className="canvas-shell view-fade">
        <svg
          ref={canvasRef}
          className="mindmap-canvas"
          onContextMenu={onCanvasContextMenu}
          onMouseMove={onCanvasMouseMove}
        />

        {emptyState.visible && <EmptyState onCreateNode={emptyState.onCreateNode} />}

        <ZoomControls onZoomIn={zoom.onZoomIn} onZoomOut={zoom.onZoomOut} onReset={zoom.onReset} />

        {contextMenu.state && contextMenu.items.length > 0 && (
          <ContextMenu
            x={contextMenu.state.screenX}
            y={contextMenu.state.screenY}
            items={contextMenu.items}
            onRequestClose={contextMenu.onRequestClose}
          />
        )}

        {profileWindows.windows.map((window) => {
          if (window.kind === 'node') {
            const targetNode = profileWindows.nodes.find((node) => node.id === window.resourceId);
            if (!targetNode) {
              return null;
            }
            const content = buildNodeProfileContent(targetNode, profileWindows.profileContext);
            return (
              <ProfileWindow
                key={window.id}
                {...content}
                position={window.position}
                zIndex={window.zIndex}
                startEditNonce={window.editNonce}
                onMove={(position) => profileWindows.onMove(window.id, position)}
                onClose={() => profileWindows.onClose(window.id)}
                onFocus={() => profileWindows.onFocus(window.id)}
                onFieldChange={(fieldKey, value) =>
                  profileWindows.onFieldChange('node', window.resourceId, fieldKey, value)
                }
              />
            );
          }
          const targetGroup = profileWindows.groups.find((group) => group.id === window.resourceId);
          if (!targetGroup) {
            return null;
          }
          const content = buildGroupProfileContent(targetGroup, profileWindows.profileContext);
          return (
            <ProfileWindow
              key={window.id}
              {...content}
              position={window.position}
              zIndex={window.zIndex}
              startEditNonce={window.editNonce}
              onMove={(position) => profileWindows.onMove(window.id, position)}
              onClose={() => profileWindows.onClose(window.id)}
              onFocus={() => profileWindows.onFocus(window.id)}
              onFieldChange={(fieldKey, value) =>
                profileWindows.onFieldChange('group', window.resourceId, fieldKey, value)
              }
            />
          );
        })}
      </main>

      {nodePanel.form && (
        <NodeEditorPanel
          mode={nodePanel.form.mode}
          values={nodePanel.values}
          nodeType={nodePanel.nodeType}
          onLabelChange={nodePanel.onLabelChange}
          onTypeChange={nodePanel.onTypeChange}
          onClose={nodePanel.onClose}
          onSubmit={nodePanel.onSubmit}
          onDeleteNode={() => {
            if (nodePanel.form?.mode === 'edit') {
              nodePanel.onDeleteNode(nodePanel.form.nodeId);
            }
          }}
          nodeTypeOptions={nodeTypeOptions}
          profileDraft={nodePanel.profileDraft}
          profileSections={nodePanel.profileSections}
          onProfileFieldChange={nodePanel.onProfileFieldChange}
          connections={nodePanel.connections}
          onConnectionRelationChange={nodePanel.onConnectionRelationChange}
          onConnectionRemove={nodePanel.onConnectionRemove}
          position={{ x: panelLayout.geometry.x, y: panelLayout.geometry.y }}
          size={{ width: panelLayout.geometry.width, height: panelLayout.geometry.height }}
          onMove={panelLayout.onMove}
          onResize={panelLayout.onResize}
          onToggleExpand={panelLayout.onToggleExpand}
          isExpanded={panelLayout.expanded}
        />
      )}

      {showConnectionPanel && connectionForm && connectionSelection && (
        <ConnectionEditorPanel
          relation={connectionForm.relation}
          onRelationChange={connectionPanel.onRelationChange}
          onSubmit={connectionPanel.onSubmit}
          onClose={connectionPanel.onClose}
          onDelete={() =>
            connectionPanel.handleDelete(connectionForm.linkKey, connectionForm.kind)
          }
          sourceEndpoint={connectionSelection.source}
          targetEndpoint={connectionSelection.target}
          onOpenSourceEndpoint={connectionPanel.onOpenSourceEndpoint}
          onOpenTargetEndpoint={connectionPanel.onOpenTargetEndpoint}
          position={{ x: panelLayout.geometry.x, y: panelLayout.geometry.y }}
          size={{ width: panelLayout.geometry.width, height: panelLayout.geometry.height }}
          onMove={panelLayout.onMove}
          onResize={panelLayout.onResize}
          onToggleExpand={panelLayout.onToggleExpand}
          isExpanded={panelLayout.expanded}
        />
      )}

      {!nodePanel.form && !connectionPanel.form && groupPanel.form && (
        <GroupEditorPanel
          mode={groupPanel.form.mode}
          values={groupPanel.values}
          onTitleChange={groupPanel.onTitleChange}
          onTypeChange={groupPanel.onTypeChange}
          onClose={groupPanel.onClose}
          onSubmit={groupPanel.onSubmit}
          onDelete={groupPanel.onDelete}
          position={{ x: panelLayout.geometry.x, y: panelLayout.geometry.y }}
          size={{ width: panelLayout.geometry.width, height: panelLayout.geometry.height }}
          onMove={panelLayout.onMove}
          onResize={panelLayout.onResize}
          onToggleExpand={panelLayout.onToggleExpand}
          isExpanded={panelLayout.expanded}
          profileDraft={groupPanel.profileDraft}
          profileSections={groupPanel.profileSections}
          onProfileFieldChange={groupPanel.onProfileFieldChange}
        />
      )}

      {utilityToast && (
        <div className="utility-toast" role="status">
          {utilityToast.message}
        </div>
      )}

      {deletion.pending && (
        <div
          className="deletion-banner"
          role="alertdialog"
          aria-live="assertive"
          aria-label="Delete resource confirmation"
        >
          <div className="deletion-banner__body">
            <p>
              Delete <strong>{deletion.pending.label}</strong>? This removes the{' '}
              {deletion.pending.kind === 'node'
                ? 'resource and its connections.'
                : 'group, nested links, and placement data.'}
            </p>
            <div className="deletion-banner__actions">
              <button type="button" className="btn" onClick={deletion.onCancel}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={deletion.onConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
