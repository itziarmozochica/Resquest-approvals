import { ChangeDetectionStrategy, Component, computed, inject, signal, WritableSignal } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IGNT_DIALOG_REF, IgntAlertComponent, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ModifyOrderStrategy, ModifyOrderStrategyModalResult } from './modify-order-strategy-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FontAwesomeModule, IgntAlertComponent, IgntButtonComponent, IgntDialogModule, TranslateModule],
  selector: 'app-modify-order-strategy-modal',
  standalone: true,
  styleUrls: ['./modify-order-strategy-modal.component.scss'],
  templateUrl: './modify-order-strategy-modal.component.html',
})
export class ModifyOrderStrategyModalComponent {
  readonly #dialogRef = inject<IgntDialogRef<ModifyOrderStrategyModalResult>>(IGNT_DIALOG_REF);
  readonly #translateService = inject(TranslateService);

  selectedStrategy: WritableSignal<ModifyOrderStrategy> = signal<ModifyOrderStrategy>('fixed');

  primaryActionText = computed(() =>
    this.selectedStrategy() === 'fixed'
      ? this.#translateService.instant('validateTicketsNew.modifyOrderStrategyModal.continueToBoxOffice')
      : this.#translateService.instant('common.continue'),
  );

  continue(): void {
    this.#dialogRef.close({
      strategy: this.selectedStrategy(),
    } satisfies ModifyOrderStrategyModalResult);
  }

  selectDynamic(): void {
    this.selectedStrategy.set('dynamic');
  }

  selectFixed(): void {
    this.selectedStrategy.set('fixed');
  }
}
