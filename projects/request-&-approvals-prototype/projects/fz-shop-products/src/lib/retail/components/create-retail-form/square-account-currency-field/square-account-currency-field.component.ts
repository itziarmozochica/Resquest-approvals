import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import type { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntTypeaheadModule, TranslateModule],
  selector: 'fz-square-account-currency-field',
  styleUrl: './square-account-currency-field.component.scss',
  templateUrl: './square-account-currency-field.component.html',
})
export class SquareAccountCurrencyFieldComponent {
  readonly options = input.required<SelectOption[]>();
  readonly visible = input.required<boolean>();
  readonly selectedOption = input<SelectOption | undefined>(undefined);

  readonly selected = output<SelectOption>();

  protected readonly translationBase = 'retailSetup.createRetailForm.integrationDetails.squareAccountCurrency';
}
