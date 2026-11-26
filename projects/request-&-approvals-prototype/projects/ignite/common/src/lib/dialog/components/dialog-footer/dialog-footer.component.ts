import { booleanAttribute, ChangeDetectionStrategy, Component, inject, input, Signal } from '@angular/core';

import { IgntButtonComponent } from '../../../actions/button/button.component';
import { IgntDialogCloseDirective } from '../../directives/dialog-close.directive';
import { IgntDialogTranslationsDirective, withIgntDialogTranslations } from '../../directives/dialog-translations.directive';
import { IgntDialogTranslations } from '../../models/dialog-translations';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
  },
  hostDirectives: [withIgntDialogTranslations()],
  imports: [IgntDialogCloseDirective, IgntButtonComponent],
  selector: 'ignt-dialog-footer',
  standalone: true,
  styleUrl: './dialog-footer.component.scss',
  templateUrl: './dialog-footer.component.html',
})
export class IgntDialogFooterComponent {
  readonly hideCancelButton = input(false, { transform: booleanAttribute });

  protected readonly translations: Signal<IgntDialogTranslations> = inject(IgntDialogTranslationsDirective).translations;
}
