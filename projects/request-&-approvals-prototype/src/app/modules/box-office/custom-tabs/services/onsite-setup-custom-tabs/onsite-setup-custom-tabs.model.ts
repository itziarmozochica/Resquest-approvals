import { OssCustomTabTypes } from '../../../shared/models/onsite-setup';

export interface CustomTabTilePreviewChildDto {
  leaf_category?: string;
  name: string;
  tile_type: string;
}

export interface CustomTabTilePrevisualizationDataDto {
  parent_hierarchy_element_children?: CustomTabTilePreviewChildDto[];
  tile_type?: string;
}

export interface CustomTabTileTargetElementInfoDto {
  hierarchy_element_id?: string;
  hierarchy_id?: string;
  place_id?: number;
  plan_id?: number;
  product_id?: string;
  session_type_id?: number | string;
}

export interface CustomTabTileDto {
  custom_color: string | null;
  custom_name: string | null;
  id: string;
  name: string;
  previsualization_data: CustomTabTilePrevisualizationDataDto | null;
  target_element_info: CustomTabTileTargetElementInfoDto;
  target_element_type: CustomTabTileTargetElementTypeET;
}

export interface CustomTabDto {
  icon: string;
  id: string;
  name: string;
  tiles: CustomTabTileDto[];
  type: OssCustomTabTypes;
}

export interface CustomTabsResponseDto {
  custom_tabs: CustomTabDto[];
}

export const CustomTabTileType = {
  LEAF: 'leaf',
  PARENT: 'parent',
} as const;

export type CustomTabTileTypeET = (typeof CustomTabTileType)[keyof typeof CustomTabTileType];

export const CustomTabTileLeafCategory = {
  PRODUCT: 'product',
} as const;

export type CustomTabTileLeafCategoryET = (typeof CustomTabTileLeafCategory)[keyof typeof CustomTabTileLeafCategory];

export const CustomTabTileTargetElementType = {
  HIERARCHY: 'HIERARCHY',
  HIERARCHY_ELEMENT: 'HIERARCHY_ELEMENT',
  PARENT_HIERARCHY_ELEMENT: 'PARENT_HIERARCHY_ELEMENT',
  PRODUCT: 'PRODUCT',
  SESSION_TYPE: 'SESSION_TYPE',
} as const;

export type CustomTabTileTargetElementTypeET = (typeof CustomTabTileTargetElementType)[keyof typeof CustomTabTileTargetElementType];

export interface CustomTabTilePreviewChild {
  leafCategory: CustomTabTileLeafCategoryET | null;
  name: string;
  tileType: CustomTabTileTypeET;
}

export interface CustomTabTilePrevisualizationData {
  parentHierarchyElementChildren: CustomTabTilePreviewChild[];
  tileType: CustomTabTileTypeET | null;
}

export interface CustomTabTileTargetElementInfo {
  hierarchyElementId: string | null;
  hierarchyId: string | null;
  placeId: number | null;
  planId: number | null;
  productId: string | null;
  sessionTypeId: number | null;
}

export interface CustomTabTile {
  customColor: string | null;
  customName: string | null;
  id: string;
  name: string;
  previsualizationData: CustomTabTilePrevisualizationData | null;
  targetElementInfo: CustomTabTileTargetElementInfo;
  targetElementType: CustomTabTileTargetElementTypeET;
}

export interface CustomTab {
  icon: string;
  id?: string;
  name: string;
  tiles: CustomTabTile[];
  type: OssCustomTabTypes;
}

export interface CustomTabsResponse {
  customTabs: CustomTab[];
}

export interface CustomTabTileRequestDto {
  custom_color?: string | null;
  custom_name?: string | null;
  id: string;
  target_element_info: CustomTabTileTargetElementInfoDto;
  target_element_type: string;
}

export interface CustomTabRequestDto {
  icon: string;
  id: string;
  name: string;
  tiles: CustomTabTileRequestDto[];
  type: string;
}

export interface CustomTabsRequestDto {
  custom_tabs: CustomTabRequestDto[];
}
