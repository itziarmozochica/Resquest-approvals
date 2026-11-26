import type { ReserveB2bEmployee, ReservePayload } from '../models/reserve-payload.model';
import { toPaymentBody, type ReservePaymentBody } from './to-payment-body';

export interface ReserveBody {
  b2b_employee?: ReserveB2bEmployee;
  channel_id?: string;
  expiration_reminders?: { hours_left: number }[];
  external_locator_id?: string;
  include_delivery_note_attachment?: boolean;
  payment?: ReservePaymentBody;
}

export function toReserveBody(payload: ReservePayload): ReserveBody {
  const reminders = payload.expirationReminders ?? [];
  return {
    ...(payload.b2bEmployee !== undefined && { b2b_employee: payload.b2bEmployee }),
    ...(payload.channelId !== undefined && { channel_id: payload.channelId }),
    ...(reminders.length > 0 && {
      expiration_reminders: reminders.map(reminder => ({ hours_left: reminder.hoursLeft })),
    }),
    ...(payload.externalLocatorId !== undefined && { external_locator_id: payload.externalLocatorId }),
    ...(payload.includeDeliveryNoteAttachment !== undefined && {
      include_delivery_note_attachment: payload.includeDeliveryNoteAttachment,
    }),
    ...(payload.payment !== undefined && { payment: toPaymentBody(payload.payment) }),
  };
}
