import { InjectionToken } from '@angular/core';

import type { Observable } from 'rxjs';

export interface IgntDialogRef<R = unknown> {
  closed$: Observable<R | undefined>;
  close: (result?: R) => void;
}

export const IGNT_DIALOG_REF = new InjectionToken<IgntDialogRef>('IGNT_DIALOG_REF');
