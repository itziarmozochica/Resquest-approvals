import { OssSessionAvailability } from './oss-session-availability.model';
import { OssTileCategory } from './oss-tile-category.enum';
import { OssTileType } from './oss-tile-type.enum';

export interface HierarchyNavigationLevel {
  leafNodes: HierarchyNavigationLeafNode[];
  name: string;
  parentNodes: HierarchyNavigationParentNode[];
  sessions: OssSessionAvailability[];
}

export interface HierarchyNavigationParentNode {
  childrenLeafNodes: HierarchyNavigationLeafNode[];
  childrenParentNodes: HierarchyNavigationParentNode[];
  customColor?: string | null;
  customName?: string | null;
  name: string;
  order: number;
}

export interface HierarchyNavigationLeafNode {
  customColor?: string | null;
  customName?: string | null;
  order: number;
  sessionId: string;
}

export interface BreadcrumbItem {
  isCurrentLevel: boolean;
  isHome: boolean;
  level: HierarchyNavigationLevel;
  name: string;
}

export interface HierarchyTileData {
  category: OssTileCategory;
  customColor?: string | null;
  hierarchyData?: HierarchyNavigationParentNode;
  id: number;
  name: string;
  session?: OssSessionAvailability;
  type: OssTileType;
}
