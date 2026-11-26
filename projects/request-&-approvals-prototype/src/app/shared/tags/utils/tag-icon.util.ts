import { IgntIconName, IgntIconVariant } from '@ignite/icon';

import { TagIconGroup, TagIconGroupKey } from '../models/tag-icon-group.model';

export const tagIconVariant: IgntIconVariant = 'light';

export const tagIconGroups: readonly TagIconGroup[] = [
  {
    icons: [
      'birthday-cake',
      'glass-cheers',
      'party-horn',
      'briefcase',
      'people-group',
      'gift',
      'children',
      'rings-wedding',
      'graduation-cap',
      'balloons',
    ],
    key: 'occasion',
  },
  {
    icons: [
      'bowling-ball',
      'flag-checkered',
      'gamepad',
      'vr-cardboard',
      'trophy',
      'golf-flag-hole',
      'pool-8-ball',
      'bullseye-arrow',
      'axe',
      'microphone-stand',
      'puzzle-piece',
    ],
    key: 'activity',
  },
  {
    icons: ['ring', 'wheelchair', 'ear-listen', 'allergies', 'kit-medical', 'heart'],
    key: 'guests',
  },
  {
    icons: ['utensils', 'burger-soda', 'leaf', 'pizza-slice', 'martini-glass'],
    key: 'foodDrink',
  },
  {
    icons: ['ghost', 'skull', 'mars-and-venus', 'fire', 'crown', 'star', 'flag'],
    key: 'theme',
  },
  {
    icons: [
      'bell',
      'file-signature',
      'triangle-exclamation',
      'clock',
      'money-bill',
      'camera',
      'music',
      'bus',
      'user-slash',
      'broom',
      'screwdriver-wrench',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ],
    key: 'onTheDay',
  },
];

export const tagIcons: readonly IgntIconName[] = tagIconGroups.flatMap(group => group.icons);

export function isTagIcon(value: string | null): value is IgntIconName {
  return value !== null && tagIcons.some(icon => icon === value);
}

export function tagIconGroupKeyOf(icon: IgntIconName | null): TagIconGroupKey | null {
  return tagIconGroups.find(group => group.icons.some(name => name === icon))?.key ?? null;
}
