import { AssignedTag } from './tag-assignment.model';

export interface BookingTagsRead {
  readonly hasFailed: boolean;
  readonly tags: readonly AssignedTag[];
}

export type TagCatalogRead = 'empty' | 'failed' | 'pending' | 'stocked';
