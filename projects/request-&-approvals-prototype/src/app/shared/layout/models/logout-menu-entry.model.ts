import type { IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core';
import type { IgntButtonIcon } from '@ignite/common';

/** How the logout entry of the sidebar and of the header menu reads. */
export interface LogoutMenuEntry {
  /** Translation key of the header menu item. */
  headerLabelKey: string;
  icon: [IconPrefix, IconName];
  igntIcon: IgntButtonIcon;
  /** Sidebar `app-menu-item` section, translated as `menu.<section>`. */
  sidebarSection: string;
}

export const LOGOUT_MENU_ENTRY: LogoutMenuEntry = {
  headerLabelKey: 'header.logOut',
  icon: ['fal', 'sign-out'],
  igntIcon: { name: 'sign-out', variant: 'light' },
  sidebarSection: 'logOut',
};

/** Fever POS for Funlab: the logout ends the Feverzone session and sends the user to the Odoo till lock, so the entry reads "Lock". */
export const LOGOUT_TO_TILL_LOCK_MENU_ENTRY: LogoutMenuEntry = {
  headerLabelKey: 'header.lock',
  icon: ['fal', 'lock-alt'],
  igntIcon: { name: 'lock-alt', variant: 'light' },
  sidebarSection: 'lock',
};
