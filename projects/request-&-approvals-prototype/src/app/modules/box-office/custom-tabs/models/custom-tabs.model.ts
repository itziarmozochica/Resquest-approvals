import { IconPrefix } from '@fortawesome/fontawesome-svg-core';

import { OssCustomTabTypes } from '../../shared/models/onsite-setup';

export const DEFAULT_ICON_PREFIX: IconPrefix = 'fal';

export const CustomTabsActionType = {
  ADD_CATEGORY: 'ADD_CATEGORY',
  ADD_TAB: 'ADD_TAB',
  ADD_TAB_ITEMS: 'ADD_TAB_ITEMS',
  DELETE_TAB: 'DELETE_TAB',
  DELETE_TAB_ITEMS: 'DELETE_TAB_ITEMS',
  EDIT_CATEGORY: 'EDIT_CATEGORY',
  EDIT_TAB_INFO: 'EDIT_TAB_INFO',
} as const;

export type CustomTabsActionTypes = (typeof CustomTabsActionType)[keyof typeof CustomTabsActionType];

export interface CustomTabsActionsConfig {
  actionsTitle: string | null;
  hasTiles: boolean;
  isEmpty: boolean;
  tabIndex: number;
  tabType?: OssCustomTabTypes;
}

export const CustomTabIcons = {
  tshirt: 'tshirt',
  heart: 'heart',
  bagsShopping: 'bags-shopping',
  badgePercent: 'badge-percent',
  gift: 'gift',
  storeAlt: 'store-alt',
  utensils: 'utensils',
  burgerSoda: 'burger-soda',
} as const;

export type CustomTabIconsTypes = (typeof CustomTabIcons)[keyof typeof CustomTabIcons];
