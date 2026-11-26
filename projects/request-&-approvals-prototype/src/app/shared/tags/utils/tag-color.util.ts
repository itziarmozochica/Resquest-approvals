import { TagColor } from '../enums/tag-color.enum';

// Ordered as the design lays the swatches out, not alphabetically.
export const tagColors: readonly TagColor[] = [
  TagColor.Neutral,
  TagColor.Primary,
  TagColor.Accent,
  TagColor.Positive,
  TagColor.Warning,
  TagColor.Danger,
];

// Matched against the list rather than with `in`, which walks the prototype chain and would let
// `constructor` through the guard.
export function tagColorOrNeutral(color: TagColor | null): TagColor {
  return color ?? TagColor.Neutral;
}

export function isTagColor(value: string | null): value is TagColor {
  return value !== null && tagColors.some(color => color === value);
}
