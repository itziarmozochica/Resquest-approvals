export interface HierarchyProductDto {
  id: string;
  name: string;
}

export interface HierarchyElementDto {
  hierarchy_elements?: HierarchyElementDto[];
  id: string;
  name: string;
  products?: HierarchyProductDto[];
}

export interface HierarchyDto {
  hierarchy_elements: HierarchyElementDto[];
  id: string;
  name: string;
}

export interface HierarchiesResponseDto {
  hierarchies: HierarchyDto[];
}

export interface HierarchyProduct {
  id: string;
  name: string;
}

export interface HierarchyElement {
  hierarchyElements: HierarchyElement[];
  id: string;
  name: string;
  products: HierarchyProduct[];
}

export interface Hierarchy {
  id: string;
  name: string;
  rootElements: HierarchyElement[];
}

export interface HierarchiesResponse {
  hierarchies: Hierarchy[];
}
