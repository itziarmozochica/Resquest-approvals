import { TagColor } from '../enums/tag-color.enum';
import { TagType } from './tag-type.model';

export const tagNameMaxLength = 40;

export interface Tag {
  readonly color: TagColor | null;
  readonly icon: string | null;
  readonly id: number;
  readonly name: string;
  readonly productCount: number;
  readonly type: TagType | null;
}

// `typeId` rather than the type itself: a write names the type, it never restates it.
export type TagDraft = Pick<Tag, 'color' | 'icon' | 'name'> & { readonly typeId: number | null };

export type ChipTag = Pick<Tag, 'color' | 'icon' | 'name'>;

// A booking sends whichever id it holds; the backend decides which row the tags land on.
export type BookingTagTarget = { readonly orderId: number } | { readonly reservationId: string };

export interface LeadTagTarget {
  readonly leadId: string;
}

export type TagAssignmentTarget = BookingTagTarget | LeadTagTarget | { readonly sessionTypeId: number };
