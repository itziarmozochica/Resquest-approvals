import { CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { TABLE, type IgntTableRowInteractionEvent } from '@ignite/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { OptimizelyService } from '../../../../../shared/optimizely/optimizely.service';
import { UserService } from '../../../../../shared/services/user/user.service';
import { Shift } from '../../../shared/models/shifts.model';
import { ShiftTableRowContent } from '../../models/shift-table-row-content.model';
import { toShiftTableRowContent } from '../../utils/shift-table-row.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, NgTemplateOutlet, PipesModule, TranslateModule, ...TABLE],
  selector: 'app-shifts-list-table',
  styleUrl: './shifts-list-table.component.scss',
  templateUrl: './shifts-list-table.component.html',
})
export class ShiftsListTableComponent {
  readonly shifts = input.required<Shift[]>();
  readonly timezone = input('', { transform: (value: string | null | undefined): string => value ?? '' });
  readonly isLoading = input(false, { transform: booleanAttribute });
  readonly showCashRegisterColumn = input(false, { transform: booleanAttribute });
  readonly showOnsiteSetupColumn = input(false, { transform: booleanAttribute });

  readonly selectedShift = output<string>();

  readonly #optimizelyService = inject(OptimizelyService);
  readonly #translate = inject(TranslateService);
  readonly #userService = inject(UserService);

  protected readonly displayCashierColumn = this.#userService.hasPermission('can_view_shifts');
  protected readonly locale = this.#translate.currentLang;
  protected readonly showCustomerSatisfaction = this.#optimizelyService.isFeatureEnabled('dual_screen_show_surveys') === true;
  protected readonly showIcCardColumn = this.#optimizelyService.isFeatureEnabled('ic_card_payment') === true;
  protected readonly showQrCodeColumn = this.#optimizelyService.isFeatureEnabled('qr_codes_payment') === true;

  protected readonly rows = computed(() => this.shifts().map(shift => toShiftTableRowContent(shift, this.showCustomerSatisfaction)));
  protected readonly rowSample = computed<ShiftTableRowContent | undefined>(() => this.rows()[0]);

  protected readonly getRowId = (row: ShiftTableRowContent): string => row.id;

  protected onRowInteraction({ item }: IgntTableRowInteractionEvent<ShiftTableRowContent>): void {
    this.selectedShift.emit(item.id);
  }
}
