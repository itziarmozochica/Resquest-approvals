import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import {
  IGNT_DIALOG_DATA,
  IGNT_DIALOG_TRANSLATIONS,
  IgntButtonComponent,
  IgntDialogCloseDirective,
  IgntDialogModule,
  igntMergeTranslations,
} from '@ignite/common';

import { ERROR_MODAL_DEFAULT_TRANSLATIONS, ErrorModalData } from './error-modal.model';

/**
 * The Ignite error dialog. Only `ErrorModalService` opens it.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.error-modal--kiosk]': 'kiosk' },
  imports: [IgntButtonComponent, IgntDialogCloseDirective, IgntDialogModule],
  selector: 'app-error-modal',
  styleUrl: './error-modal.component.scss',
  templateUrl: './error-modal.component.html',
})
export class ErrorModalComponent {
  readonly #data = inject<ErrorModalData>(IGNT_DIALOG_DATA);
  readonly #translations = inject(IGNT_DIALOG_TRANSLATIONS, { optional: true });

  protected readonly kiosk = this.#data.kiosk;
  protected readonly messages = this.#data.messages;
  protected readonly okLabel = computed(() => igntMergeTranslations(this.#translations, ERROR_MODAL_DEFAULT_TRANSLATIONS).okButton);
  protected readonly title = this.#data.title;
}
