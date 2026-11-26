import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnChanges, signal, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ValidationHistoryEntry } from '@fz-original/app/modules/validation/models/validation-history.model';
import { AccessControlService } from '@fz-original/app/modules/validation/services/access-control/access-control.service';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

import { IconsModule } from '../../../../icons/icons.module';
import { PipesModule } from '../../../../pipes/pipes.module';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgFor, NgIf, TranslateModule, IconsModule, PipesModule],
  selector: 'app-validation-history',
  standalone: true,
  styleUrls: ['./validation-history.component.scss'],
  templateUrl: './validation-history.component.html',
})
export class ValidationHistoryComponent implements OnChanges {
  #accessControlService = inject(AccessControlService);
  #destroyRef = inject(DestroyRef);

  @Input() code = '';
  isLoading = signal<boolean>(false);
  @Input() mainPlanId: number | undefined;
  @Input() sessionTimezone: string | undefined;
  validationHistory = signal<ValidationHistoryEntry[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['code'] || changes['mainPlanId']) && this.code && this.mainPlanId) {
      this.#loadValidationHistory();
    }
  }

  #loadValidationHistory(): void {
    if (!this.code || !this.mainPlanId) {
      return;
    }

    this.isLoading.set(true);
    this.validationHistory.set([]);

    this.#accessControlService
      .getCodeValidationHistory(this.code, [this.mainPlanId])
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(history => {
        this.validationHistory.set(history);
      });
  }
}
