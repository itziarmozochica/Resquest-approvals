import { AssignedTag, TagAssignment } from '../models/tag-assignment.model';

export function inheritedTagsOf<T extends Pick<AssignedTag, 'id'>>(inherited: readonly T[], own: readonly AssignedTag[]): readonly T[] {
  const ownIds = new Set(own.map(tag => tag.id));

  return inherited.filter(tag => !ownIds.has(tag.id));
}

export function mergedTagsOf(assignments: readonly TagAssignment[]): readonly AssignedTag[] {
  const byId = new Map<number, AssignedTag>();

  for (const assignment of assignments) {
    for (const tag of assignment.tags) {
      byId.set(tag.id, tag);
    }
  }

  return [...byId.values()].sort((first, second) => first.name.localeCompare(second.name));
}
