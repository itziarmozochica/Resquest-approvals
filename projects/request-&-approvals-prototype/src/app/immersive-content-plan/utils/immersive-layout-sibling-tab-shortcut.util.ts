import type { ImmersiveSiblingTab } from '../models/immersive-sibling-tabs.model';

export interface ImmersiveSiblingTabShortcut {
  readonly linkLabelKey?: string;
  readonly messageKey: string;
  readonly tab?: ImmersiveSiblingTab;
}

export interface ImmersiveSiblingTabLink {
  readonly labelKey: string;
  readonly tab: ImmersiveSiblingTab;
}

// The single source for which module types carry a sibling-tab shortcut, and what it says. Keyed by
// the same `type` string `getDescriptor` reads, so a type absent here simply renders no shortcut. A type
// may carry a note without a tab link: it then declares only the `messageKey`.
const SHORTCUT_BY_MODULE_TYPE: Readonly<Record<string, ImmersiveSiblingTabShortcut>> = {
  'immersive-artists': { messageKey: 'planEdition.immersiveContentPlan.artistsNote' },
  'immersive-photo': {
    linkLabelKey: 'planEdition.immersiveContentPlan.mediaTabShortcutLink',
    messageKey: 'planEdition.immersiveContentPlan.mediaTabShortcutBody',
    tab: 'media',
  },
  'immersive-venue': {
    linkLabelKey: 'planEdition.immersiveContentPlan.venueTabShortcutLink',
    messageKey: 'planEdition.immersiveContentPlan.venueTabShortcutBody',
    tab: 'venue',
  },
};

export function resolveSiblingTabShortcut(moduleType: string): ImmersiveSiblingTabShortcut | undefined {
  return SHORTCUT_BY_MODULE_TYPE[moduleType];
}
