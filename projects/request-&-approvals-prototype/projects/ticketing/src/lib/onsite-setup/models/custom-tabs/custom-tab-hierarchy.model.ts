import type { Session } from '../../../availability/models/session.model';

export interface CustomTabHierarchyLeafNode {
  customColor: string | null;
  customName: string | null;
  order: number;
  sessionId: string | null;
}

export interface CustomTabHierarchyParentNode {
  customColor: string | null;
  customName: string | null;
  leafNodes: readonly CustomTabHierarchyLeafNode[];
  name: string;
  order: number;
  parentNodes: readonly CustomTabHierarchyParentNode[];
}

export interface CustomTabHierarchyLevel {
  leafNodes: readonly CustomTabHierarchyLeafNode[];
  name: string;
  parentNodes: readonly CustomTabHierarchyParentNode[];
  sessions: readonly Session[];
}
