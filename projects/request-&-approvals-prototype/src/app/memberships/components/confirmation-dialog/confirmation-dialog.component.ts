import { NgClass, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';

import {
  ConfirmationDialogConfig,
  ConfirmationDialogService,
} from '@fz-original/app/memberships/services/confirmation-dialog/confirmation-dialog.service';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss'],
  imports: [NgIf, NgClass, IconsModule, IgntButtonComponent],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent implements OnInit, OnDestroy {
  #dialogService = inject(ConfirmationDialogService);
  #cdRef = inject(ChangeDetectorRef);
  #destroy$ = new Subject<void>();

  isVisible = false;
  title = '';
  message = '';
  acceptLabel = 'common.accept';
  cancelLabel = 'common.cancel';
  customStyle = false;
  isDanger = false;

  ngOnInit(): void {
    this.#dialogService.dialogVisibility$.pipe(takeUntil(this.#destroy$)).subscribe((isVisible: boolean) => {
      this.isVisible = isVisible;
      this.#cdRef.markForCheck();
    });

    this.#dialogService.config$.pipe(takeUntil(this.#destroy$)).subscribe((config: ConfirmationDialogConfig | null) => {
      if (config) {
        this.title = config.title;
        this.message = config.message;
        this.acceptLabel = config.acceptLabel || 'common.accept';
        this.cancelLabel = config.cancelLabel || 'common.cancel';
        this.isDanger = config.isDanger || false;
        this.customStyle = config.customStyle || false;
        this.#cdRef.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.#destroy$.next();
    this.#destroy$.complete();
  }

  accept(): void {
    this.#dialogService.accept();
  }

  dismiss(): void {
    this.#dialogService.dismiss();
  }
}
