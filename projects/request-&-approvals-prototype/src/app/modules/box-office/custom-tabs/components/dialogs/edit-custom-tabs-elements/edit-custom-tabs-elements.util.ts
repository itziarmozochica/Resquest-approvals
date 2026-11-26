import {
  DialogEditCustomTabElementsSelectedItem,
  SelectedTileTargetElementType,
  TileConverter,
} from '../../../models/edit-custom-tabs-elements.model';
import { CustomTabTile, CustomTabTileTargetElementType } from '../../../services/onsite-setup-custom-tabs/onsite-setup-custom-tabs.model';
import { HierarchyElement, HierarchyProduct } from '../../../services/retail-setup-hierarchies/retail-setup-hierarchies.model';

const EMPTY_ELEMENTS: HierarchyElement[] = [];
const EMPTY_PRODUCTS: HierarchyProduct[] = [];

export function collectAutoExpandedIds(elements: HierarchyElement[]): Set<string> {
  const ids = new Set<string>();
  const stack: HierarchyElement[] = elements.slice();

  while (stack.length > 0) {
    const element = stack.pop()!;
    if (element.hierarchyElements.length + element.products.length === 1) {
      ids.add(element.id);
    }

    const children = element.hierarchyElements;
    for (let i = 0, len = children.length; i < len; i++) {
      stack.push(children[i]);
    }
  }

  return ids;
}

export function collectExpandedIdsFromSearch(elements: HierarchyElement[], searchTerm: string): Set<string> {
  const expandedIds = new Set<string>();
  const term = searchTerm.toLowerCase().trim();

  if (!term) return expandedIds;

  const traverse = (items: HierarchyElement[]): boolean => {
    let hasMatch = false;

    for (let i = 0, len = items.length; i < len; i++) {
      const element = items[i];

      const matchesName = element.name.toLowerCase().includes(term);

      const hasMatchingProducts = element.products.some(product => product.name.toLowerCase().includes(term));

      const children = element.hierarchyElements;
      const childrenHaveMatch = children.length > 0 && traverse(children);

      if (matchesName || hasMatchingProducts || childrenHaveMatch) {
        hasMatch = true;
        if (hasMatchingProducts || childrenHaveMatch) {
          expandedIds.add(element.id);
        }
      }
    }

    return hasMatch;
  };

  traverse(elements);
  return expandedIds;
}

export function collectParentIdsForSelectedItems(elements: HierarchyElement[], selectedIds: string[]): Set<string> {
  const expandedIds = new Set<string>();
  if (!selectedIds.length) return expandedIds;

  const selectedSet = new Set(selectedIds);
  const parentPath: string[] = [];

  const traverse = (items: HierarchyElement[]): boolean => {
    let foundInSubtree = false;

    for (let i = 0, len = items.length; i < len; i++) {
      const element = items[i];
      let foundHere = selectedSet.has(element.id);

      if (!foundHere) {
        const products = element.products;
        for (let j = 0, pLen = products.length; j < pLen; j++) {
          if (selectedSet.has(products[j].id)) {
            expandedIds.add(element.id);
            foundHere = true;
            break;
          }
        }
      }

      let foundInChildren = false;
      const children = element.hierarchyElements;
      if (children.length > 0) {
        parentPath.push(element.id);
        foundInChildren = traverse(children);
        parentPath.pop();
      }

      if (foundHere || foundInChildren) {
        for (let k = 0, pathLen = parentPath.length; k < pathLen; k++) {
          expandedIds.add(parentPath[k]);
        }
        foundInSubtree = true;
      }
    }

    return foundInSubtree;
  };

  traverse(elements);
  return expandedIds;
}

export function filterElementsBySearchTerm(elements: HierarchyElement[], searchTerm: string): HierarchyElement[] {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return elements;

  const filter = (items: HierarchyElement[]): HierarchyElement[] => {
    const result: HierarchyElement[] = [];

    for (let i = 0, len = items.length; i < len; i++) {
      const element = items[i];

      if (element.name.toLowerCase().includes(term)) {
        result.push(element);
        continue;
      }

      const children = element.hierarchyElements;
      const filteredChildren = children.length > 0 ? filter(children) : EMPTY_ELEMENTS;

      const products = element.products;
      let filteredProducts: HierarchyProduct[] = EMPTY_PRODUCTS;

      for (let j = 0, pLen = products.length; j < pLen; j++) {
        if (products[j].name.toLowerCase().includes(term)) {
          if (filteredProducts === EMPTY_PRODUCTS) {
            filteredProducts = [];
          }
          filteredProducts.push(products[j]);
        }
      }

      if (filteredChildren.length || filteredProducts.length) {
        result.push({
          ...element,
          hierarchyElements: filteredChildren,
          products: filteredProducts,
        });
      }
    }

    return result;
  };

  return filter(elements);
}

export function collectVisibleItemIds(elements: HierarchyElement[], expandedIds: Set<string>, includeProducts: boolean): string[] {
  const visibleIds: string[] = [];
  const stack: Array<[HierarchyElement[], number]> = [[elements, 0]];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const items = frame[0];
    const index = frame[1];

    if (index >= items.length) {
      stack.pop();
      continue;
    }

    const element = items[index];
    frame[1] = index + 1;

    visibleIds.push(element.id);

    if (expandedIds.has(element.id)) {
      if (includeProducts) {
        const products = element.products;
        for (let i = 0, len = products.length; i < len; i++) {
          visibleIds.push(products[i].id);
        }
      }

      const children = element.hierarchyElements;
      if (children.length > 0) {
        stack.push([children, 0]);
      }
    }
  }

  return visibleIds;
}

const createTileConverter =
  <T extends SelectedTileTargetElementType>(
    type: T,
    extractId: (info: CustomTabTile['targetElementInfo']) => string | null,
    createInfo: (id: string) => DialogEditCustomTabElementsSelectedItem['target_element_info'],
  ): TileConverter =>
  (tile: CustomTabTile): DialogEditCustomTabElementsSelectedItem | null => {
    const id = extractId(tile.targetElementInfo);
    if (!id) return null;

    return {
      id: tile.id,
      name: tile.name,
      color: tile.customColor,
      custom_name: tile.customName,
      target_element_type: type,
      target_element_info: createInfo(id),
    } as DialogEditCustomTabElementsSelectedItem;
  };

export const TILE_CONVERTERS: Partial<Record<CustomTabTile['targetElementType'], TileConverter>> = {
  [CustomTabTileTargetElementType.PRODUCT]: createTileConverter(
    CustomTabTileTargetElementType.PRODUCT,
    info => info.productId,
    id => ({ product_id: id }),
  ),
  [CustomTabTileTargetElementType.HIERARCHY]: createTileConverter(
    CustomTabTileTargetElementType.HIERARCHY,
    info => info.hierarchyId,
    id => ({ hierarchy_id: id }),
  ),
  [CustomTabTileTargetElementType.HIERARCHY_ELEMENT]: createTileConverter(
    CustomTabTileTargetElementType.HIERARCHY_ELEMENT,
    info => info.hierarchyElementId,
    id => ({ hierarchy_element_id: id }),
  ),
  [CustomTabTileTargetElementType.PARENT_HIERARCHY_ELEMENT]: createTileConverter(
    CustomTabTileTargetElementType.PARENT_HIERARCHY_ELEMENT,
    info => info.hierarchyElementId,
    id => ({ hierarchy_element_id: id }),
  ),
};
