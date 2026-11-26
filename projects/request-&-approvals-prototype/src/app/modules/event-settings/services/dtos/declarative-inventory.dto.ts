export interface DeclarativeInventoryNonConformityDto {
  code: string;
  field: string | null;
  message: string;
}

export interface DeclarativeInventoryStatusDto {
  has_declarative_inventory: boolean;
  non_conformities: DeclarativeInventoryNonConformityDto[];
}

export interface UpdateDeclarativeInventoryRequestDto {
  enabled: boolean;
}
