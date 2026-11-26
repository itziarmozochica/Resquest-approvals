import { adaptSessionApi } from '../../../availability/api-adapters/adapt-session-api';
import type {
  CustomTabForDateApi,
  CustomTileApi,
  CustomTileExtraInfoApi,
  HierarchyCategoryApi,
  HierarchyExtraInfoApi,
  HierarchyProductApi,
  HierarchyProductVariationApi,
  SessionTypeExtraInfoApi,
} from '../../models/custom-tabs/api/custom-tab-for-date-response.model';
import {
  CustomTileTargetType,
  isHierarchyTargetType,
  type CustomTile,
  type CustomTileExtraInfo,
  type HierarchyCategory,
  type HierarchyProduct,
  type HierarchyProductVariation,
} from '../../models/custom-tabs/custom-tile.model';

export function adaptCustomTabForDateResponse(response: CustomTabForDateApi): readonly CustomTile[] {
  return (response.custom_tiles ?? [])
    .map(wrapper => adaptCustomTileApi(wrapper.custom_tile))
    .sort((first, second) => first.position - second.position);
}

function adaptCustomTileApi(tile: CustomTileApi): CustomTile {
  return {
    color: tile.color ?? null,
    extraInfo: adaptCustomTileExtraInfoApi(tile.target_element_type, tile.target_element_extra_info),
    name: tile.name ?? null,
    position: tile.position,
    sessions: (tile.sessions ?? []).map(session => adaptSessionApi(session)),
    targetType: tile.target_element_type,
  };
}

function adaptCustomTileExtraInfoApi(
  targetType: CustomTileTargetType,
  extraInfo: CustomTileExtraInfoApi | null | undefined,
): CustomTileExtraInfo | null {
  if (extraInfo === undefined || extraInfo === null) {
    return null;
  }

  if (targetType === CustomTileTargetType.SessionType) {
    // Safe: the wire union is discriminated by `target_element_type`, checked on the line above.
    const sessionTypeExtraInfo = extraInfo as SessionTypeExtraInfoApi;

    return {
      placeCityTimezone: sessionTypeExtraInfo.place_city_timezone ?? null,
      placeName: sessionTypeExtraInfo.place_name ?? null,
    };
  }

  if (isHierarchyTargetType(targetType)) {
    // Safe: the wire union is discriminated by `target_element_type`, checked on the line above.
    const hierarchyExtraInfo = extraInfo as HierarchyExtraInfoApi;

    return {
      children: adaptHierarchyCategoriesApi(hierarchyExtraInfo.children),
      name: hierarchyExtraInfo.name,
      placeCityTimezone: hierarchyExtraInfo.place_city_timezone ?? null,
      productVariations: adaptHierarchyProductVariationsApi(hierarchyExtraInfo.product_variations),
      products: adaptHierarchyProductsApi(hierarchyExtraInfo.products),
    };
  }

  return null;
}

function adaptHierarchyCategoriesApi(categories: HierarchyCategoryApi[] | null | undefined): readonly HierarchyCategory[] | null {
  if (categories === undefined || categories === null) {
    return null;
  }

  return categories.map(category => ({
    children: adaptHierarchyCategoriesApi(category.children),
    name: category.name,
    productVariations: adaptHierarchyProductVariationsApi(category.product_variations),
    products: adaptHierarchyProductsApi(category.products),
  }));
}

function adaptHierarchyProductsApi(products: HierarchyProductApi[] | null | undefined): readonly HierarchyProduct[] | null {
  if (products === undefined || products === null) {
    return null;
  }

  return products.map(product => ({
    name: product.name,
    productVariations: adaptHierarchyProductVariationsApi(product.product_variations) ?? [],
  }));
}

function adaptHierarchyProductVariationsApi(
  variations: HierarchyProductVariationApi[] | null | undefined,
): readonly HierarchyProductVariation[] | null {
  if (variations === undefined || variations === null) {
    return null;
  }

  return variations.map(variation => ({ sessionId: variation.session_id }));
}
