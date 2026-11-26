import { type ModificationReservation, type ModificationReservationDto } from '../../models/modification-payment-link.model';

export function toModificationReservation(dto: ModificationReservationDto): ModificationReservation {
  return {
    cartId: dto.cart_id,
    customer: {
      email: dto.customer.email,
      name: dto.customer.name,
      userId: dto.customer.user_id,
    },
    expiresAt: dto.expires_at,
    mainPlanId: dto.main_plan_id,
    reservationId: dto.reservation_id,
  };
}
