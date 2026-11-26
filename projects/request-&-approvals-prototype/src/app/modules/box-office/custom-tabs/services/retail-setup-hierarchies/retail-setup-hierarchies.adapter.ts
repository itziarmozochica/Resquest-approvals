import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseErrorResponse, BaseResponse, IBaseResponse } from '@fz-original/app/shared/models/base-response';

import {
  HierarchiesResponse,
  HierarchiesResponseDto,
  Hierarchy,
  HierarchyDto,
  HierarchyElement,
  HierarchyElementDto,
  HierarchyProduct,
  HierarchyProductDto,
} from './retail-setup-hierarchies.model';

@Injectable({
  providedIn: 'root',
})
export class RetailSetupHierarchiesAdapter implements AdapterInterface<BaseResponse<HierarchiesResponse>> {
  fromApi(response: IBaseResponse<HierarchiesResponseDto> | null): BaseResponse<HierarchiesResponse> {
    return new BaseResponse<HierarchiesResponse>(this.#getData(response?.data), this.#getError(response?.error));
  }

  #convertHierarchy(hierarchyDto: HierarchyDto): Hierarchy {
    return {
      id: hierarchyDto.id,
      name: hierarchyDto.name,
      rootElements: hierarchyDto.hierarchy_elements.map(element => this.#convertHierarchyElement(element)),
    };
  }

  #convertHierarchyElement(elementDto: HierarchyElementDto): HierarchyElement {
    return {
      hierarchyElements: elementDto.hierarchy_elements?.map(child => this.#convertHierarchyElement(child)) ?? [],
      id: elementDto.id,
      name: elementDto.name,
      products: elementDto.products?.map(product => this.#convertProduct(product)) ?? [],
    };
  }

  #convertProduct(productDto: HierarchyProductDto): HierarchyProduct {
    return {
      id: productDto.id,
      name: productDto.name,
    };
  }

  #getData(data: HierarchiesResponseDto | null | undefined): HierarchiesResponse | null {
    if (!data) {
      return null;
    }
    return {
      hierarchies: data.hierarchies.map(hierarchy => this.#convertHierarchy(hierarchy)),
    };
  }

  #getError(error: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (!error) {
      return null;
    }
    return { code: error.code, message: error.message };
  }
}
