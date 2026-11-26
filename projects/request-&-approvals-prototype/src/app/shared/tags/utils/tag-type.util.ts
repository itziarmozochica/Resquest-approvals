import { TagTypeApiResponse } from '../models/tag-type-response.model';
import { TagType } from '../models/tag-type.model';

export function toTagType(tagType: TagTypeApiResponse): TagType {
  return { id: tagType.id, name: tagType.name, sortOrder: tagType.sort_order };
}

// Absent as well as null: a tag read from a deploy that predates the field must degrade, not throw.
export function toTagTypeOrNull(tagType: TagTypeApiResponse | null | undefined): TagType | null {
  return tagType === null || tagType === undefined ? null : toTagType(tagType);
}
