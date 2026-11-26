import { InjectionToken, type Injector } from '@angular/core';

import type { IgntDialogSizes } from './dialog-sizes';

interface IgntDialogConfig<D> {
  /** Data to pass to the content component (injectable via IGNT_DIALOG_DATA). */
  data?: D;
  /** Whether the user can close the dialog via escape and/or backdrop click. */
  disableCloseShortcuts?: boolean;
  /** The injector to use for the modal. Default is the root injector. */
  injector?: Injector;
}

export interface IgntDialogModalConfig<D = unknown> extends IgntDialogConfig<D> {
  /** The size of the modal. Default is 'md'. */
  size?: IgntDialogSizes;
}

export interface IgntDialogSidePanelConfig<D = unknown> extends IgntDialogConfig<D> {
  /** The width of the side panel on tablet and above. Default is 'sm'. */
  size?: IgntDialogSizes;
}

export interface IgntDialogMessageModalConfig extends IgntDialogConfig<unknown> {
  /** The size of the modal. Default is 'sm'. */
  size?: IgntDialogSizes;
}

export interface IgntDialogConfirmModalConfig extends IgntDialogConfig<unknown> {
  /** Marks the accept action as destructive, rendering it with the danger variant. Default is false. */
  isDestructive?: boolean;
  /** The size of the modal. Default is 'sm'. */
  size?: IgntDialogSizes;
}

export const IGNT_DIALOG_MODAL_DEFAULT_CONFIG: IgntDialogModalConfig = {
  size: 'md',
};

export const IGNT_DIALOG_MESSAGE_MODAL_DEFAULT_CONFIG: IgntDialogMessageModalConfig = {
  disableCloseShortcuts: true,
  size: 'sm',
};

export const IGNT_DIALOG_CONFIRM_MODAL_DEFAULT_CONFIG: IgntDialogConfirmModalConfig = {
  disableCloseShortcuts: true,
  size: 'sm',
};

export const IGNT_DIALOG_CONFIG = new InjectionToken<
  IgntDialogModalConfig | IgntDialogSidePanelConfig | IgntDialogMessageModalConfig | IgntDialogConfirmModalConfig
>('IGNT_DIALOG_CONFIG');
export const IGNT_DIALOG_DATA = new InjectionToken<unknown>('IGNT_DIALOG_DATA');
