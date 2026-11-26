import { OssSessionAvailability, OssSessionAvailabilityDto } from './oss-session-availability.model';
import { OssTargetElementType } from './oss-target-element-type.enum';

export type OssCustomTileExtraInfoDto = OssCustomTileExtraInfoSessionTypeDto | OssCustomTileExtraInfoHierarchyElementDto;

export interface OssCustomTileExtraInfoSessionTypeDto {
  place_name?: string;
  place_city_timezone?: string;
}

export interface OssCustomTileExtraInfoHierarchyElementDto {
  children?: OssHierarchyCategoryDto[];
  name: string;
  place_city_timezone?: string;
  product_variations?: OssHierarchyProductVariationDto[];
  products?: OssHierarchyProductDto[];
}

export interface OssHierarchyCategoryDto {
  name: string;
  children?: OssHierarchyCategoryDto[];
  products?: OssHierarchyProductDto[];
  product_variations?: OssHierarchyProductVariationDto[];
}

export interface OssHierarchyProductDto {
  name: string;
  product_variations: OssHierarchyProductVariationDto[];
}

export interface OssHierarchyProductVariationDto {
  session_id: string;
}

export interface OssCustomTileDto {
  color?: string | null;
  name?: string | null;
  position: number;
  sessions: OssSessionAvailabilityDto[];
  target_element_extra_info: OssCustomTileExtraInfoDto;
  target_element_type: OssTargetElementType;
}

export type OssCustomTileExtraInfo = OssCustomTileExtraInfoSessionType | OssCustomTileExtraInfoHierarchyElement;

export interface OssCustomTileExtraInfoSessionType {
  placeName: string | null;
  placeCityTimezone: string | null;
}

export interface OssCustomTileExtraInfoHierarchyElement {
  name: string;
  placeCityTimezone: string | null;
  children?: OssHierarchyCategory[];
  products?: OssHierarchyProduct[];
  productVariations?: OssHierarchyProductVariation[];
}

export interface OssHierarchyCategory {
  name: string;
  children?: OssHierarchyCategory[];
  products?: OssHierarchyProduct[];
  productVariations?: OssHierarchyProductVariation[];
}

export interface OssHierarchyProduct {
  name: string;
  productVariations: OssHierarchyProductVariation[];
}

export interface OssHierarchyProductVariation {
  sessionId: string;
}

export interface OssCustomTile {
  color?: string | null;
  name?: string | null;
  position: number;
  sessions: OssSessionAvailability[];
  targetElementExtraInfo: OssCustomTileExtraInfo | null;
  targetElementType: OssTargetElementType;
}
