import { IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core';
import type { IgntButtonIcon } from '@ignite/common';
import { TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';

export interface ActionBase {
  icon: [IconPrefix, IconName];
  id: string;
  /**
   * Ignite twin of `icon`, read by the header account menu (`app-menu-actions`).
   * Transitional: once the remaining FontAwesome consumers of `icon` (`app-header-action-button`,
   * `app-mobile-menu-item` and the sidebar logout entry) render `ignt-icon`, `icon` takes this
   * shape and `igntIcon` goes away.
   */
  igntIcon?: IgntButtonIcon;
}

export interface ActionAttention {
  badge?: string;
}

export interface MenuItem extends ActionBase, ActionAttention {
  label: string;
  tag?: string | null;
  tagSentiment?: TagSentiment;
}
