import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseErrorResponse, BaseResponse, IBaseResponse } from '@fz-original/app/shared/models/base-response';

import { OssCustomTabType, OssCustomTabTypes } from '../../../shared/models/onsite-setup';
import {
  CustomTab,
  CustomTabDto,
  CustomTabRequestDto,
  CustomTabsRequestDto,
  CustomTabsResponse,
  CustomTabsResponseDto,
  CustomTabTile,
  CustomTabTileDto,
  CustomTabTileLeafCategory,
  CustomTabTileLeafCategoryET,
  CustomTabTilePreviewChild,
  CustomTabTilePreviewChildDto,
  CustomTabTilePrevisualizationData,
  CustomTabTilePrevisualizationDataDto,
  CustomTabTileRequestDto,
  CustomTabTileTargetElementInfo,
  CustomTabTileTargetElementInfoDto,
  CustomTabTileTargetElementType,
  CustomTabTileTargetElementTypeET,
  CustomTabTileType,
  CustomTabTileTypeET,
} from './onsite-setup-custom-tabs.model';

@Injectable({
  providedIn: 'root',
})
export class OnsiteSetupCustomTabsAdapter implements AdapterInterface<BaseResponse<CustomTabsResponse>> {
  fromApi(response: IBaseResponse<CustomTabsResponseDto> | null): BaseResponse<CustomTabsResponse> {
    return new BaseResponse<CustomTabsResponse>(this.#getData(response?.data), this.#getError(response?.error));
  }

  toApi(customTabs: CustomTab[]): CustomTabsRequestDto {
    return {
      custom_tabs: customTabs.map(tab => this.#convertCustomTabToApi(tab)),
    };
  }

  #convertCustomTab(customTabDto: CustomTabDto): CustomTab {
    return {
      icon: customTabDto.icon,
      id: customTabDto.id,
      name: customTabDto.name,
      tiles: customTabDto.tiles.map(tile => this.#convertCustomTabTile(tile)),
      type: this.#convertTabType(customTabDto.type),
    };
  }

  #convertCustomTabTile(customTabTileDto: CustomTabTileDto): CustomTabTile {
    return {
      customColor: customTabTileDto.custom_color,
      customName: customTabTileDto.custom_name,
      id: customTabTileDto.id,
      name: customTabTileDto.name,
      previsualizationData: this.#convertPrevisualizationData(customTabTileDto.previsualization_data),
      targetElementInfo: this.#convertTargetElementInfo(customTabTileDto.target_element_info),
      targetElementType: this.#convertTargetElementType(customTabTileDto.target_element_type),
    };
  }

  #convertCustomTabTileToApi(tile: CustomTabTile): CustomTabTileRequestDto {
    const dto: CustomTabTileRequestDto = {
      id: tile.id,
      target_element_info: this.#convertTargetElementInfoToApi(tile.targetElementInfo),
      target_element_type: tile.targetElementType,
    };

    dto.custom_color = tile.customColor ?? null;
    dto.custom_name = tile.customName ?? null;

    return dto;
  }

  #convertCustomTabToApi(tab: CustomTab): CustomTabRequestDto {
    return {
      icon: tab.icon,
      id: tab.id ?? '',
      name: tab.name,
      tiles: tab.tiles.map(tile => this.#convertCustomTabTileToApi(tile)),
      type: tab.type,
    };
  }

  #convertLeafCategory(category: string | undefined): CustomTabTileLeafCategoryET | null {
    if (!category) {
      return null;
    }
    if (category === CustomTabTileLeafCategory.PRODUCT) {
      return CustomTabTileLeafCategory.PRODUCT;
    }
    return null;
  }

  #convertPreviewChild(customTabTilePreviewChildDto: CustomTabTilePreviewChildDto): CustomTabTilePreviewChild {
    return {
      leafCategory: this.#convertLeafCategory(customTabTilePreviewChildDto.leaf_category),
      name: customTabTilePreviewChildDto.name,
      tileType: this.#convertTileType(customTabTilePreviewChildDto.tile_type),
    };
  }

  #convertPrevisualizationData(
    customTabTilePrevisualizationDataDto: CustomTabTilePrevisualizationDataDto | null,
  ): CustomTabTilePrevisualizationData | null {
    if (!customTabTilePrevisualizationDataDto) {
      return null;
    }
    return {
      parentHierarchyElementChildren:
        customTabTilePrevisualizationDataDto.parent_hierarchy_element_children?.map(child => this.#convertPreviewChild(child)) ?? [],
      tileType: customTabTilePrevisualizationDataDto.tile_type
        ? this.#convertTileType(customTabTilePrevisualizationDataDto.tile_type)
        : null,
    };
  }

  #convertTabType(type: string): OssCustomTabTypes {
    if (type === OssCustomTabType.specific_items) {
      return OssCustomTabType.specific_items;
    }
    return OssCustomTabType.parent_hierarchy_element;
  }

  #convertTargetElementInfo(customTabTileTargetElementInfoDto: CustomTabTileTargetElementInfoDto): CustomTabTileTargetElementInfo {
    return {
      hierarchyElementId: customTabTileTargetElementInfoDto.hierarchy_element_id ?? null,
      hierarchyId: customTabTileTargetElementInfoDto.hierarchy_id ?? null,
      placeId: customTabTileTargetElementInfoDto.place_id ?? null,
      planId: customTabTileTargetElementInfoDto.plan_id ?? null,
      productId: customTabTileTargetElementInfoDto.product_id ?? null,
      sessionTypeId: this.#parseSessionTypeId(customTabTileTargetElementInfoDto.session_type_id),
    };
  }

  #convertTargetElementInfoToApi(info: CustomTabTileTargetElementInfo): CustomTabTileTargetElementInfoDto {
    const dto: CustomTabTileTargetElementInfoDto = {};
    if (info.hierarchyElementId) {
      dto.hierarchy_element_id = info.hierarchyElementId;
    }
    if (info.hierarchyId) {
      dto.hierarchy_id = info.hierarchyId;
    }
    if (info.placeId !== null) {
      dto.place_id = info.placeId;
    }
    if (info.planId !== null) {
      dto.plan_id = info.planId;
    }
    if (info.productId) {
      dto.product_id = info.productId;
    }
    if (info.sessionTypeId !== null) {
      dto.session_type_id = info.sessionTypeId;
    }
    return dto;
  }

  #convertTargetElementType(type: CustomTabTileTargetElementTypeET): CustomTabTileTargetElementTypeET {
    return CustomTabTileTargetElementType?.[type] ?? CustomTabTileTargetElementType.PARENT_HIERARCHY_ELEMENT;
  }

  #convertTileType(type: string): CustomTabTileTypeET {
    if (type === CustomTabTileType.PARENT) {
      return CustomTabTileType.PARENT;
    }
    return CustomTabTileType.LEAF;
  }

  #getData(data: CustomTabsResponseDto | null | undefined): CustomTabsResponse | null {
    if (!data) {
      return null;
    }
    return {
      customTabs: data.custom_tabs.map(tab => this.#convertCustomTab(tab)),
    };
  }

  #getError(error: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (!error) {
      return null;
    }
    return { code: error.code, message: error.message };
  }

  #parseSessionTypeId(sessionTypeId: number | string | undefined): number | null {
    if (sessionTypeId === undefined || sessionTypeId === null) {
      return null;
    }
    return typeof sessionTypeId === 'string' ? parseInt(sessionTypeId, 10) : sessionTypeId;
  }
}
