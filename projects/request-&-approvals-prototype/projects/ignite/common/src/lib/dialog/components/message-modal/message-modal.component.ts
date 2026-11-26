import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';

import { IgntButtonComponent } from '../../../actions/button/button.component';
import { IgntDialogModule } from '../../dialog.module';
import { IgntDialogCloseDirective } from '../../directives/dialog-close.directive';
import { IgntDialogTranslationsDirective, withIgntDialogTranslations } from '../../directives/dialog-translations.directive';
import { IGNT_DIALOG_DATA } from '../../models/dialog-options';
import { IgntDialogTranslations } from '../../models/dialog-translations';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [withIgntDialogTranslations()],
  imports: [IgntDialogModule, IgntDialogCloseDirective, IgntButtonComponent],
  selector: 'ignt-message-modal',
  standalone: true,
  styleUrl: './message-modal.component.scss',
  templateUrl: './message-modal.component.html',
})
export class IgntMessageModalComponent {
  readonly #dialogData = inject<{ message: string; title: string }>(IGNT_DIALOG_DATA);
  protected readonly title = this.#dialogData.title;
  protected readonly message = this.#dialogData.message;
  protected readonly translations: Signal<IgntDialogTranslations> = inject(IgntDialogTranslationsDirective).translations;
}
