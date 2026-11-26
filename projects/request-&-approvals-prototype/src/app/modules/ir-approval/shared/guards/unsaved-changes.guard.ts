import { CanDeactivateFn } from '@angular/router';

import { Observable } from 'rxjs';

/** Components guarded against accidental navigation expose a `canDeactivate` hook. */
export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Observable<boolean>;
}

/** Blocks route deactivation when the component reports unsaved work (it prompts the user itself). */
export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = component => component.canDeactivate();
