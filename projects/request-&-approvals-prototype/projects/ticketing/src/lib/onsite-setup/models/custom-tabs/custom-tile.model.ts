import type { Session } from '../../../availability/models/session.model';

export enum CustomTileTargetType {
  HierarchyElement = 'HIERARCHY_ELEMENT',
  ParentHierarchyElement = 'PARENT_HIERARCHY_ELEMENT',
  Product = 'PRODUCT',
  SessionType = 'SESSION_TYPE',
}

export interface HierarchyProductVariation {
  sessionId: string;
}

export interface HierarchyProduct {
  name: string;
  productVariations: readonly HierarchyProductVariation[];
}

export interface HierarchyCategory {
  children: readonly HierarchyCategory[] | null;
  name: string;
  productVariations: readonly HierarchyProductVariation[] | null;
  products: readonly HierarchyProduct[] | null;
}

export interface HierarchyExtraInfo {
  children: readonly HierarchyCategory[] | null;
  name: string;
  placeCityTimezone: string | null;
  productVariations: readonly HierarchyProductVariation[] | null;
  products: readonly HierarchyProduct[] | null;
}

export interface SessionTypeExtraInfo {
  placeCityTimezone: string | null;
  placeName: string | null;
}

export type CustomTileExtraInfo = HierarchyExtraInfo | SessionTypeExtraInfo;

export interface CustomTile {
  color: string | null;
  extraInfo: CustomTileExtraInfo | null;
  name: string | null;
  position: number;
  sessions: readonly Session[];
  targetType: CustomTileTargetType;
}

export function isHierarchyTargetType(targetType: CustomTileTargetType): boolean {
  return (
    targetType === CustomTileTargetType.HierarchyElement ||
    targetType === CustomTileTargetType.ParentHierarchyElement ||
    targetType === CustomTileTargetType.Product
  );
}
