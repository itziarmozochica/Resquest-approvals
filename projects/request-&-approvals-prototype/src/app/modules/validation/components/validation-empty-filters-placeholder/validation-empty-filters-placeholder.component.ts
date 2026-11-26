import { ChangeDetectionStrategy, Component, output } from '@angular/core';

import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntIconComponent, TranslateModule],
  selector: 'app-validation-empty-filters-placeholder',
  standalone: true,
  styleUrl: './validation-empty-filters-placeholder.component.scss',
  templateUrl: './validation-empty-filters-placeholder.component.html',
})
export class ValidationEmptyFiltersPlaceholderComponent {
  readonly openHowToValidate = output<void>();

  protected onOpenHowToClick(): void {
    this.openHowToValidate.emit();
  }
}
