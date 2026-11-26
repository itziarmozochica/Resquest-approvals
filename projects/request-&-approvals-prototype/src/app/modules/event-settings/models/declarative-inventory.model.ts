export interface DeclarativeInventoryNonConformity {
  code: string;
  field: string | null;
  message: string;
}

export interface DeclarativeInventoryStatus {
  hasDeclarativeInventory: boolean;
  nonConformities: DeclarativeInventoryNonConformity[];
}

export interface DeclarativeInventorySectionState {
  hasLoadFailed: boolean;
  isLoading: boolean;
  nonConformities: DeclarativeInventoryNonConformity[];
}
