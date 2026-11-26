import { TagTargetType } from '../models/tag-assignment.model';
import { TagAssignmentTarget } from '../models/tag.model';

export function tagTargetTypeOf(target: TagAssignmentTarget): TagTargetType {
  if ('leadId' in target) {
    return 'lead';
  }

  if ('sessionTypeId' in target) {
    return 'session_type';
  }

  return 'reservationId' in target ? 'reservation' : 'order';
}

export function tagTargetIdOf(target: TagAssignmentTarget): string {
  if ('leadId' in target) {
    return target.leadId;
  }

  if ('sessionTypeId' in target) {
    return String(target.sessionTypeId);
  }

  return 'reservationId' in target ? target.reservationId : String(target.orderId);
}

export function isSameTagTarget(first: TagAssignmentTarget | null, second: TagAssignmentTarget | null): boolean {
  if (first === null || second === null) {
    return first === second;
  }

  return tagTargetTypeOf(first) === tagTargetTypeOf(second) && tagTargetIdOf(first) === tagTargetIdOf(second);
}

const subtitleKeys: Record<TagTargetType, string> = {
  lead: 'partnerTags.booking.subtitleLead',
  main_plan: 'partnerTags.booking.subtitleBooking',
  order: 'partnerTags.booking.subtitleOrder',
  reservation: 'partnerTags.booking.subtitleReservation',
  session_type: 'partnerTags.booking.subtitleSessionType',
};

export function tagTargetSubtitleKey(target: TagAssignmentTarget): string {
  return subtitleKeys[tagTargetTypeOf(target)];
}
