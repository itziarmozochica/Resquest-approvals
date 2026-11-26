import { IgntDialogService } from '@ignite/common';
import { map, Observable, take } from 'rxjs';

import { ConfirmActionDialogComponent } from '../components/confirm-action-dialog/confirm-action-dialog.component';
import { ConfirmActionDialogData } from '../components/confirm-action-dialog/confirm-action-dialog.model';

export function openConfirmActionDialog(dialogService: IgntDialogService, data: ConfirmActionDialogData): Observable<boolean> {
  return dialogService
    .openModal<boolean, ConfirmActionDialogData>(ConfirmActionDialogComponent, { data, disableCloseShortcuts: true, size: 'sm' })
    .closed$.pipe(
      take(1),
      map(confirmed => confirmed === true),
    );
}
