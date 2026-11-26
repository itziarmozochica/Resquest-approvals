import { IconName, IconPrefix, IconProp } from '@fortawesome/fontawesome-svg-core';

import { DEFAULT_ICON_PREFIX } from './models/custom-tabs.model';

export function parseIconString(iconString: string): IconProp {
  if (!iconString.length) {
    return [DEFAULT_ICON_PREFIX, 'heart'];
  }

  const hyphenIndex = iconString.indexOf('-');
  if (hyphenIndex === -1) {
    return [DEFAULT_ICON_PREFIX, iconString as IconName];
  }

  return [iconString.substring(0, hyphenIndex) as IconPrefix, iconString.substring(hyphenIndex + 1) as IconName];
}

export function formatIconToString(icon: IconProp): string {
  return Array.isArray(icon) ? `${icon[0]}-${icon[1]}` : String(icon);
}
