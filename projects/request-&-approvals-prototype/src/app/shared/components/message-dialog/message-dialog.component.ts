import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgClass, NgFor, NgIf, NgSwitch, NgSwitchCase, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, TemplateRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntAlertComponent, type IgntAlertSentiment } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { Observable } from 'rxjs';

export type MessageDialogSectionAlignment = 'left' | 'center';

export interface MessageDialogSectionBase {
  align?: MessageDialogSectionAlignment;
  messageClass?: string;
}

export interface MessageDialogMessageSection extends MessageDialogSectionBase {
  messages: string[];
  type: 'messages';
  renderHtml?: boolean;
}

export interface MessageDialogListSection extends MessageDialogSectionBase {
  items: string[];
  title?: string;
  type: 'list';
}

export interface MessageDialogTemplateSection extends MessageDialogSectionBase {
  template?: TemplateRef<unknown> | null;
  type: 'template';
}

export type MessageDialogSection = MessageDialogMessageSection | MessageDialogListSection | MessageDialogTemplateSection;

export interface MessageDialogConfig {
  acceptButtonLabel: string;
  acceptButtonVariant?: 'default' | 'danger';
  allowCancelDuringLoading?: boolean;
  buttonsLayout?: 'horizontal' | 'vertical';
  cancelButtonLabel?: string;
  confirmationCheckboxErrorLabel?: string;
  confirmationCheckboxLabel?: string;
  errorCode?: string | number | null;
  errorCodeLabel?: string;
  hasCloseButton?: boolean;
  infoBannerSentiment?: IgntAlertSentiment;
  infoBannerText?: string;
  onAccept?: () => Observable<boolean | undefined>;
  sections: MessageDialogSection[];
  title?: string;
  useTitleAsHeader?: boolean;
}

export interface MessageDialogMessagesConfig extends Omit<MessageDialogConfig, 'sections'> {
  align?: MessageDialogSectionAlignment;
  messageClass?: string;
  messages: string[];
  sections?: never;
}

export type MessageDialogData = MessageDialogConfig | MessageDialogMessagesConfig;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgFor, NgIf, NgSwitch, NgSwitchCase, IgntAlertComponent, IgntButtonComponent, IgntCheckboxComponent, NgTemplateOutlet],
  selector: 'app-message-dialog',
  standalone: true,
  styleUrls: ['./message-dialog.component.scss'],
  templateUrl: './message-dialog.component.html',
})
export class MessageDialogComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject<DialogRef<boolean | undefined>>(DialogRef);
  readonly data = inject<MessageDialogData>(DIALOG_DATA);

  readonly viewModel = this.#normalizeConfig(this.data);
  readonly isConfirmationChecked = signal<boolean>(false);
  readonly isLoading = signal(false);
  readonly hasAttemptedAccept = signal<boolean>(false);

  readonly hasConfirmationError = computed<boolean>(() => {
    return Boolean(this.viewModel.confirmationCheckboxLabel) && this.hasAttemptedAccept() && !this.isConfirmationChecked();
  });

  get hasRequiredConfirmation(): boolean {
    return Boolean(this.viewModel.confirmationCheckboxLabel);
  }

  close(response: boolean | undefined): void {
    this.#dialogRef.close(response);
  }

  onAcceptClick(): void {
    this.hasAttemptedAccept.set(true);

    if (this.hasRequiredConfirmation && !this.isConfirmationChecked()) {
      return;
    }

    if (this.viewModel.onAccept) {
      this.isLoading.set(true);
      this.viewModel
        .onAccept()
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: success => {
            this.isLoading.set(false);
            this.#dialogRef.close(success);
          },
          error: () => {
            this.isLoading.set(false);
          },
        });
    } else {
      this.close(true);
    }
  }

  toggleConfirmation(value: boolean): void {
    this.isConfirmationChecked.set(value);
  }

  #applyDefaults(config: MessageDialogConfig): MessageDialogConfig {
    return {
      acceptButtonVariant: 'default',
      allowCancelDuringLoading: false,
      buttonsLayout: 'horizontal',
      cancelButtonLabel: '',
      confirmationCheckboxErrorLabel: '',
      confirmationCheckboxLabel: '',
      errorCode: null,
      errorCodeLabel: '',
      hasCloseButton: false,
      infoBannerSentiment: 'info',
      infoBannerText: '',
      title: '',
      useTitleAsHeader: true,
      ...config,
      sections: config.sections ?? [],
    };
  }

  #normalizeConfig(config: MessageDialogData): MessageDialogConfig {
    if ('messages' in config) {
      const { messages, align, messageClass, ...rest } = config;

      return this.#applyDefaults({
        ...rest,
        sections: [
          {
            type: 'messages',
            align,
            messageClass,
            messages,
          },
        ],
      });
    }

    return this.#applyDefaults(config);
  }
}
