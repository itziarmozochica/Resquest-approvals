import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';

import { IgntButtonComponent } from '../../../actions/button/button.component';
import type { IgntButtonSentiment } from '../../../actions/button/models/button.model';
import { IgntDialogModule } from '../../dialog.module';
import { IgntDialogCloseDirective } from '../../directives/dialog-close.directive';
import { IgntDialogTranslationsDirective, withIgntDialogTranslations } from '../../directives/dialog-translations.directive';
import { IGNT_DIALOG_DATA } from '../../models/dialog-options';
import { IgntDialogTranslations } from '../../models/dialog-translations';

interface IgntConfirmModalData {
  message: string;
  title: string;
  isDestructive?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [withIgntDialogTranslations()],
  imports: [IgntButtonComponent, IgntDialogCloseDirective, IgntDialogModule],
  selector: 'ignt-confirm-modal',
  standalone: true,
  styleUrl: './confirm-modal.component.scss',
  templateUrl: './confirm-modal.component.html',
})
export class IgntConfirmModalComponent {
  readonly #dialogData = inject<IgntConfirmModalData>(IGNT_DIALOG_DATA);
  protected readonly title = this.#dialogData.title;
  protected readonly message = this.#dialogData.message;
  protected readonly acceptSentiment: IgntButtonSentiment = this.#dialogData.isDestructive ? 'danger' : 'brand';
  protected readonly translations: Signal<IgntDialogTranslations> = inject(IgntDialogTranslationsDirective).translations;
}
