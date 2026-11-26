import { TagType } from '../models/tag-type.model';

export interface TagTypeGroup<T> {
  readonly tags: readonly T[];
  readonly type: TagType | null;
}

type TypedTag = { readonly type: TagType | null };

// Both reads answer already in group order — by the type's `sort_order`, then by tag name, untyped
// last — so one pass preserves it and nothing is sorted here. The index is what keeps a type that
// comes back out of order inside its first block instead of opening a second heading for it.
export function groupTagsByType<T extends TypedTag>(tags: readonly T[]): TagTypeGroup<T>[] {
  const groups: { tags: T[]; type: TagType | null }[] = [];
  const indexByTypeId = new Map<number | null, number>();

  for (const tag of tags) {
    const typeId = tag.type?.id ?? null;
    const index = indexByTypeId.get(typeId);

    if (index === undefined) {
      indexByTypeId.set(typeId, groups.length);
      groups.push({ tags: [tag], type: tag.type });

      continue;
    }

    groups[index]?.tags.push(tag);
  }

  return groups;
}
