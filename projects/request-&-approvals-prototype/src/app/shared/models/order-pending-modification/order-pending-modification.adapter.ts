import { type OrderPendingModificationDTO } from './order-pending-modification.dto';
import { type OrderPendingModification } from './order-pending-modification.model';

export function orderPendingModificationFromDto(dto: OrderPendingModificationDTO | null | undefined): OrderPendingModification | null {
  if (dto == null) {
    return null;
  }

  return {
    expiresAt: dto.expires_at,
    planId: dto.plan_id,
    reservationId: dto.reservation_id,
  };
}
