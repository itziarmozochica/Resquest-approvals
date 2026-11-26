import { DeclarativeInventoryStatus } from '../../models/declarative-inventory.model';
import { DeclarativeInventoryStatusDto } from '../dtos/declarative-inventory.dto';

export function toDeclarativeInventoryStatus(dto: DeclarativeInventoryStatusDto): DeclarativeInventoryStatus {
  return {
    hasDeclarativeInventory: dto.has_declarative_inventory,
    nonConformities: dto.non_conformities.map(nonConformity => ({
      code: nonConformity.code,
      field: nonConformity.field,
      message: nonConformity.message,
    })),
  };
}
