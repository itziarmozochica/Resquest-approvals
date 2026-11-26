import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import {
  IGNT_DIALOG_REF,
  IgntAlertComponent,
  IgntButtonComponent,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
  IgntDialogRef,
  IgntToastService,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';

import { crossEventBulkEditEventsListPath } from '../../models/cross-event-bulk-edit-review.model';
import { CrossEventBulkEditStore } from '../../store/cross-event-bulk-edit.store';
import {
  joinTranslatedPropertyNames,
  listedReviewTicketTypes,
  reviewTitleTranslateKey,
  translatedPropertyNames,
} from '../../utils/cross-event-bulk-edit-review.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    IgntButtonComponent,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    IgntDialogHeaderComponent,
    IgntIconComponent,
    IgntTagComponent,
    TranslateModule,
  ],
  selector: 'app-cross-event-bulk-edit-review-dialog',
  styleUrl: './cross-event-bulk-edit-review-dialog.component.scss',
  templateUrl: './cross-event-bulk-edit-review-dialog.component.html',
})
export class CrossEventBulkEditReviewDialogComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject<IgntDialogRef<boolean> | null>(IGNT_DIALOG_REF, { optional: true });
  readonly #router = inject(Router);
  readonly #store = inject(CrossEventBulkEditStore);
  readonly #toast = inject(IgntToastService);
  readonly #translate = inject(TranslateService);
  protected readonly isSubmitting = this.#store.isSubmitting;
  protected readonly listedTicketTypes = computed(() =>
    listedReviewTicketTypes(this.#store.sessionTypes(), this.#store.selectedTicketTypeIds()),
  );
  protected readonly propertyNames = computed(() =>
    joinTranslatedPropertyNames(
      translatedPropertyNames(this.#store.selectedProperties(), (key: string) => this.#translate.instant(key)),
      this.#translate.instant('inventory.ticketTypes.bulkEdit.confirmation.and'),
    ),
  );
  protected readonly selectedPlanCount = computed(() => this.#store.selectedPlanIds().length);
  protected readonly selectedTicketTypeCount = computed(() => this.listedTicketTypes().length);
  protected readonly titleKey = computed(() => reviewTitleTranslateKey(this.selectedTicketTypeCount(), this.selectedPlanCount()));

  protected onConfirm(): void {
    if (this.#store.isSubmitting()) {
      return;
    }

    this.#store
      .submit()
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#toast.show({
            description: this.#translate.instant('inventory.ticketTypes.bulkEdit.errorMessage'),
            sentiment: 'danger',
          });
          this.#dialogRef?.close(false);
        },
        next: () => {
          this.#toast.show({
            description: this.#translate.instant('listPlan.crossEventBulkEdit.review.toast.description'),
            sentiment: 'positive',
            title: this.#translate.instant('listPlan.crossEventBulkEdit.review.toast.title'),
          });
          void this.#router.navigate([crossEventBulkEditEventsListPath]);
          this.#dialogRef?.close(true);
        },
      });
  }

  protected onGoBack(): void {
    if (this.#store.isSubmitting()) {
      return;
    }

    this.#dialogRef?.close(false);
  }
}
