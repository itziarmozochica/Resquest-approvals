import { Tag } from './tag.model';

export type TagTargetType = 'lead' | 'main_plan' | 'order' | 'reservation' | 'session_type';

// The assignments read answers "what is on this target", not the catalog's "how widely is this used".
export type AssignedTag = Omit<Tag, 'productCount'>;

export interface TagAssignment {
  readonly tags: readonly AssignedTag[];
  // Echoed back exactly as sent, casing included, so a caller matches on the string it already holds.
  readonly targetId: string;
}
