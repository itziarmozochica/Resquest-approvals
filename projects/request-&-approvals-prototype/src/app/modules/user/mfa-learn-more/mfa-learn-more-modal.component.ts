import { formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, LOCALE_ID } from '@angular/core';

import {
  IGNT_DIALOG_DATA,
  IGNT_DIALOG_REF,
  IgntAlertComponent,
  IgntButtonComponent,
  IgntDialogModule,
  type IgntAlertSentiment,
  type IgntDialogRef,
} from '@ignite/common';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { TranslateModule } from '@ngx-translate/core';

import { MfaLearnMoreModalData, MfaLearnMoreModalResult } from './mfa-learn-more-modal-data.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, IgntButtonComponent, IgntDialogModule, IgntLinkComponent, TranslateModule],
  selector: 'app-mfa-learn-more-modal',
  styleUrl: './mfa-learn-more-modal.component.scss',
  templateUrl: './mfa-learn-more-modal.component.html',
})
export class MfaLearnMoreModalComponent {
  readonly #dialogData = inject<MfaLearnMoreModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<MfaLearnMoreModalResult | undefined>>(IGNT_DIALOG_REF);
  readonly #locale = inject(LOCALE_ID);

  protected readonly deadlineAlertDescriptionKey: string = this.#dialogData.isGraceExpired
    ? 'mfa.learnMore.deadlineAlert.descriptionExpired'
    : 'mfa.learnMore.deadlineAlert.description';
  protected readonly deadlineAlertSentiment: IgntAlertSentiment = this.#dialogData.isGraceExpired ? 'danger' : 'warning';
  protected readonly deadlineAlertTitleKey: string = this.#dialogData.isGraceExpired
    ? 'mfa.learnMore.deadlineAlert.titleExpired'
    : 'mfa.learnMore.deadlineAlert.title';
  protected readonly deadlineDate: string | null = this.#resolveDeadlineDate();
  protected readonly deadlineTitleParams: Readonly<{ date: string }> = { date: this.deadlineDate ?? '' };
  protected readonly introKey: string = this.#resolveIntroKey();
  protected readonly introParams: Readonly<{ orgName: string }> = {
    orgName: this.#dialogData.orgName?.trim() ?? '',
  };
  protected readonly showDeadlineAlert: boolean = this.#dialogData.isGraceExpired || this.deadlineDate !== null;

  protected onFullSetupGuideClick(event: MouseEvent): void {
    // TODO(B2BI-16355): wire href when product supplies the Full setup guide URL
    event.preventDefault();
  }

  protected onRemindLater(): void {
    this.#dialogRef.close(MfaLearnMoreModalResult.Dismiss);
  }

  protected onSetup(): void {
    this.#dialogRef.close(MfaLearnMoreModalResult.Setup);
  }

  #resolveDeadlineDate(): string | null {
    const enforcedAt: string | null = this.#dialogData.enforcedAt;

    if (enforcedAt === null) {
      return null;
    }

    return formatDate(enforcedAt, 'd MMM y', this.#locale);
  }

  #resolveIntroKey(): string {
    const orgName: string | null | undefined = this.#dialogData.orgName?.trim();

    if (orgName === undefined || orgName === '') {
      return 'mfa.learnMore.introWithoutOrg';
    }

    return 'mfa.learnMore.intro';
  }
}
