import { OssCustomTabTypes } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';

import {
  CustomTabTile,
  CustomTabTileLeafCategoryET,
  CustomTabTileTargetElementType,
  CustomTabTileTypeET,
} from '../services/onsite-setup-custom-tabs';
import { HierarchyElement } from '../services/retail-setup-hierarchies';

export interface DialogEditCustomTabElementsState {
  hierarchyElements: HierarchyElement[];
  isVisible: boolean;
  tabType: OssCustomTabTypes | null;
}

export interface SelectedTilePreviewChild {
  leafCategory: CustomTabTileLeafCategoryET | null;
  name: string;
  tileType: CustomTabTileTypeET;
}

interface SelectedTileBase {
  children?: SelectedTilePreviewChild[];
  color?: string | null;
  custom_name?: string | null;
  id?: string | null;
  name: string;
}

interface SelectedTileHierarchy extends SelectedTileBase {
  target_element_info: {
    hierarchy_id: string;
  };
  target_element_type: typeof CustomTabTileTargetElementType.HIERARCHY;
}

interface SelectedTileHierarchyElement extends SelectedTileBase {
  target_element_info: {
    hierarchy_element_id: string;
  };
  target_element_type:
    | typeof CustomTabTileTargetElementType.HIERARCHY_ELEMENT
    | typeof CustomTabTileTargetElementType.PARENT_HIERARCHY_ELEMENT;
}

interface SelectedTileProduct extends SelectedTileBase {
  target_element_info: {
    product_id: string;
  };
  target_element_type: typeof CustomTabTileTargetElementType.PRODUCT;
}

export type DialogEditCustomTabElementsSelectedItem = SelectedTileHierarchy | SelectedTileHierarchyElement | SelectedTileProduct;

export type SelectedTileTargetElementType = DialogEditCustomTabElementsSelectedItem['target_element_type'];

export type TileConverter = (tile: CustomTabTile) => DialogEditCustomTabElementsSelectedItem | null;

export const SelectionMode = {
  SINGLE: 'single',
  MULTIPLE: 'multiple',
} as const;

export type SelectionModes = (typeof SelectionMode)[keyof typeof SelectionMode];
