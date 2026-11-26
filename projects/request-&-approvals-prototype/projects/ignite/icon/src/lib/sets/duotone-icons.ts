/* eslint-disable no-restricted-imports */
import { faCrown, faMinusCircle, faPlusCircle, faSpinnerThird } from '@fortawesome/pro-duotone-svg-icons';

export const duotoneIcons = {
  crown: faCrown,
  'minus-circle': faMinusCircle,
  'plus-circle': faPlusCircle,
  'spinner-third': faSpinnerThird,
} as const;

export type DuotoneIconName = keyof typeof duotoneIcons;
