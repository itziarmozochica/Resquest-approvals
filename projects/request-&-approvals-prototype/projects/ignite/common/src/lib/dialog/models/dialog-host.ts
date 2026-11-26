import type { OverlayRef } from '@angular/cdk/overlay';
import type { CdkPortalOutlet } from '@angular/cdk/portal';
import { InjectionToken, type Signal } from '@angular/core';

import type { IgntDialogType } from './dialog-type';

export interface IgntDialogHost {
  dialogType: IgntDialogType;
  portalOutlet: Signal<CdkPortalOutlet>;
}

export const IGNT_DIALOG_HOST = new InjectionToken<IgntDialogHost>('IGNT_DIALOG_HOST');
export const IGNT_DIALOG_OVERLAY = new InjectionToken<OverlayRef>('IGNT_DIALOG_OVERLAY');
