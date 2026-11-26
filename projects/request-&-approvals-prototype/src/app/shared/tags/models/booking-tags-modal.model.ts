import { TagAssignmentTarget } from './tag.model';

export interface BookingTagsModalData {
  // Reservation first: a paid reservation carries both ids, and the tags live on the reservation.
  readonly target: TagAssignmentTarget;
  readonly lockedTagIds?: readonly number[];
}

export interface BookingTagsModalResult {
  readonly tagIds: readonly number[];
}
