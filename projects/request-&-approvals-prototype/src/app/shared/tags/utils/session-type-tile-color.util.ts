import { TagColor } from '../enums/tag-color.enum';
import { isTagColor } from './tag-color.util';

// The tile stripe is painted through a CSS variable, so it needs an actual colour and there is no TypeScript
// token API: each value is the tag's mark colour (`$tag-color-marks` in `_tag-colors.scss`) repeated as a hex,
// tagged with the SCSS token it has to stay in step with. The marks, not the pastel fills, stand out from the
// tile defaults (primary-500 sessions, positive-500 products, warning-500 add-ons).
const tileColorHexes = {
  accent: '#522da5', // $palette-accent-700
  danger: '#b6003c', // $palette-danger-700
  neutral: '#06232c', // $palette-neutral-700
  positive: '#18824c', // $palette-positive-700
  primary: '#0068b0', // $palette-primary-700
  warning: '#bf6a00', // $palette-warning-700
} as const satisfies Record<TagColor, string>;

// The backend resolves `session_type.color` from the session type's tags, so the tile only maps the token to its hex.
// A token outside the palette is skipped, as the tag catalog read drops it.
export function sessionTypeTileColor(color: string | null | undefined): string | null {
  const token = color ?? null;

  return isTagColor(token) ? tileColorHexes[token] : null;
}
