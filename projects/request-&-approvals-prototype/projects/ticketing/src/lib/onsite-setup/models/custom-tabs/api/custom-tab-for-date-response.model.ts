import type { SessionApi } from '../../../../availability/models/api/session.model';
import type { CustomTileTargetType } from '../custom-tile.model';

export interface HierarchyProductVariationApi {
  session_id: string;
}

export interface HierarchyProductApi {
  name: string;
  product_variations?: HierarchyProductVariationApi[] | null;
}

export interface HierarchyCategoryApi {
  name: string;
  children?: HierarchyCategoryApi[] | null;
  product_variations?: HierarchyProductVariationApi[] | null;
  products?: HierarchyProductApi[] | null;
}

export interface HierarchyExtraInfoApi {
  name: string;
  children?: HierarchyCategoryApi[] | null;
  place_city_timezone?: string | null;
  product_variations?: HierarchyProductVariationApi[] | null;
  products?: HierarchyProductApi[] | null;
}

export interface SessionTypeExtraInfoApi {
  place_city_timezone?: string | null;
  place_name?: string | null;
}

export type CustomTileExtraInfoApi = HierarchyExtraInfoApi | SessionTypeExtraInfoApi;

export interface CustomTileApi {
  position: number;
  target_element_type: CustomTileTargetType;
  color?: string | null;
  name?: string | null;
  sessions?: SessionApi[] | null;
  target_element_extra_info?: CustomTileExtraInfoApi | null;
}

export interface CustomTileWrapperApi {
  custom_tile: CustomTileApi;
}

export interface CustomTabForDateApi {
  custom_tiles?: CustomTileWrapperApi[] | null;
}
