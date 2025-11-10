import type { Dispatch, SetStateAction } from 'react';
import type { GroupType, NodeType } from './graph';

export type CanvasContextMenuState = {
  kind: 'canvas';
  screenX: number;
  screenY: number;
  graphX: number;
  graphY: number;
};

export type NodeContextMenuState = {
  kind: 'node';
  screenX: number;
  screenY: number;
  nodeId: string;
};

export type ConnectionContextMenuState = {
  kind: 'connection';
  screenX: number;
  screenY: number;
  edgeKey: string;
};

export type GroupConnectionContextMenuState = {
  kind: 'group-connection';
  screenX: number;
  screenY: number;
  linkKey: string;
};

export type GroupContextMenuState = {
  kind: 'group';
  screenX: number;
  screenY: number;
  groupId: string;
};

export type ContextMenuState =
  | CanvasContextMenuState
  | NodeContextMenuState
  | ConnectionContextMenuState
  | GroupConnectionContextMenuState
  | GroupContextMenuState;

export type NodeFormState =
  | {
      mode: 'create';
      position: { x: number; y: number };
    }
  | {
      mode: 'edit';
      nodeId: string;
    };

export type ConnectionDraft =
  | {
      kind: 'node';
      sourceNodeId: string;
      cursor: { x: number; y: number };
    }
  | {
      kind: 'group';
      sourceGroupId: string;
      cursor: { x: number; y: number };
    };

export type GroupFormState =
  | {
      mode: 'create';
      groupId: string;
    }
  | {
      mode: 'edit';
      groupId: string;
    };

export type GroupFormValues = {
  title: string;
  type: GroupType;
};

export type ProfileWindowState = {
  id: string;
  kind: 'node' | 'group';
  resourceId: string;
  position: { x: number; y: number };
  zIndex: number;
  editNonce: number;
};

export type PendingDeletion = {
  kind: 'node' | 'group';
  id: string;
  label: string;
};

export type ConnectionFormState =
  | {
      mode: 'edit';
      kind: 'node';
      linkKey: string;
      relation: string;
    }
  | {
      mode: 'edit';
      kind: 'group';
      linkKey: string;
      relation: string;
    };

export type NodeConnectionEndpoint = {
  kind: 'node';
  id: string;
  label: string;
  type: NodeType;
};

export type GroupConnectionEndpoint = {
  kind: 'group';
  id: string;
  label: string;
  type: GroupType;
};

export type ConnectionEditorSelection =
  | {
      kind: 'node';
      key: string;
      relation: string;
      source: NodeConnectionEndpoint | null;
      target: NodeConnectionEndpoint | null;
    }
  | {
      kind: 'group';
      key: string;
      relation: string;
      source: GroupConnectionEndpoint | null;
      target: GroupConnectionEndpoint | null;
    };

export type BooleanStateSetter = Dispatch<SetStateAction<boolean>>;
