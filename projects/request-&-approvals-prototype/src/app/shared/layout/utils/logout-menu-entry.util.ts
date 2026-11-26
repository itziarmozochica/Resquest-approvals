import { EntryPointClient } from '@fz-original/app/app/enums/entry-point-client.enum';

import { LOGOUT_MENU_ENTRY, LOGOUT_TO_TILL_LOCK_MENU_ENTRY, type LogoutMenuEntry } from '../models/logout-menu-entry.model';

/** Odoo as the entry point turns the logout into a till lock, so the menu entry reads "Lock". */
export function toLogoutMenuEntry(entryPointClient: EntryPointClient): LogoutMenuEntry {
  return entryPointClient === EntryPointClient.Odoo ? LOGOUT_TO_TILL_LOCK_MENU_ENTRY : LOGOUT_MENU_ENTRY;
}
