import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IgntDialogService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, EMPTY, filter, finalize, Observable, switchMap, take, tap } from 'rxjs';

import { TransferIntent } from '../../../../../../models/cart/transfer-intent.model';
import { TicketTransferService } from '../../../../../../services/ticket-transfer/ticket-transfer.service';
import { ToastService } from '../../../../../../services/toast/toast.service';
import { translationRevisionSignal } from '../../../../../../utils/translation-revision.signal.util';
import { TimelineItemComponent } from '../../../../../timeline-item/timeline-item.component';
import { TimelineA11yLabels, TimelineIconSentiment } from '../../../../../timeline/models/timeline-item.model';
import { TicketHistoryItem, TicketHistoryItemType } from '../ticket-history-item';
import {
  CancelTransferConfirmModalComponent,
  CancelTransferConfirmModalData,
  CancelTransferConfirmModalResult,
} from './cancel-transfer-confirm-modal/cancel-transfer-confirm-modal.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, IgntLinkComponent, TimelineItemComponent, TranslateModule],
  selector: 'app-ticket-history-item',
  standalone: true,
  styleUrl: './ticket-history-item.component.scss',
  templateUrl: './ticket-history-item.component.html',
})
export class TicketHistoryItemComponent {
  historyItem = input.required<TicketHistoryItem>();
  sessionTimezone = input<string | null>(null);
  showConnectorBelow = input<boolean>(false);
  transferIntent = input<TransferIntent | null>(null);

  ticketUpdated = output<void>();

  readonly #dialogService = inject(IgntDialogService);
  readonly #translate = inject(TranslateService);
  readonly #ticketTransferService = inject(TicketTransferService);
  readonly #toastService = inject(ToastService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #translationRevision = translationRevisionSignal(this.#translate);

  static readonly dateFormat = 'DD/MM/YY, hh:mm A';
  static readonly descriptionLineClamp = 2;
  static readonly codeHistoryItemTypes: readonly TicketHistoryItemType[] = [
    TicketHistoryItemType.CREATED,
    TicketHistoryItemType.VALIDATION,
    TicketHistoryItemType.VALIDATION_FAILED,
    TicketHistoryItemType.VALIDATION_REVERTED,
  ];
  static readonly iconSentimentByItemType: Readonly<Record<TicketHistoryItemType, TimelineIconSentiment>> = {
    [TicketHistoryItemType.CREATED]: 'default',
    [TicketHistoryItemType.DEFAULT]: 'default',
    [TicketHistoryItemType.TRANSFER_COMPLETED]: 'default',
    [TicketHistoryItemType.TRANSFER_IN_PROGRESS]: 'default',
    [TicketHistoryItemType.VALIDATION]: 'success',
    [TicketHistoryItemType.VALIDATION_FAILED]: 'failed',
    [TicketHistoryItemType.VALIDATION_REVERTED]: 'default',
  };

  protected readonly dateFormat = TicketHistoryItemComponent.dateFormat;
  protected readonly ticketHistoryItemType = TicketHistoryItemType;
  protected readonly a11yLabels = computed<TimelineA11yLabels>(() => {
    this.#translationRevision();
    return {
      collapseDetails: this.#translate.instant('validateTicketsNew.ticketHistory.collapse'),
      details: this.#translate.instant('validateTicketsNew.ticketDetail.ticketHistory'),
      expandDetails: this.#translate.instant('validateTicketsNew.ticketHistory.expand'),
    };
  });
  protected readonly icon = computed<IconProp>(() => ['fal', this.historyItem().icon]);
  protected readonly iconSentiment = computed<TimelineIconSentiment>(
    () => TicketHistoryItemComponent.iconSentimentByItemType[this.historyItem().type],
  );
  protected readonly isCodeHistoryItem = computed<boolean>(() =>
    TicketHistoryItemComponent.codeHistoryItemTypes.includes(this.historyItem().type),
  );
  protected readonly isTransferInProgress = computed<boolean>(() => this.historyItem().type === TicketHistoryItemType.TRANSFER_IN_PROGRESS);
  protected readonly profile = computed<string | null>(() => {
    const extraInfo = this.historyItem().extraInfo;
    return extraInfo !== null && 'profile' in extraInfo ? extraInfo.profile : null;
  });
  protected readonly validatorLabel = computed<string | null>(() => {
    const extraInfo = this.historyItem().extraInfo;
    const validator = extraInfo !== null && 'validator' in extraInfo ? extraInfo.validator : null;
    if (!validator) {
      return null;
    }
    return validator.email ? `${validator.email} (ID.${validator.id})` : `ID.${validator.id}`;
  });
  protected readonly transferUser = computed<{ email: string } | null>(() => {
    const extraInfo = this.historyItem().extraInfo;
    return extraInfo !== null && 'user' in extraInfo ? extraInfo.user : null;
  });
  protected readonly descriptionLineClamp = computed<number | null>(() =>
    this.hasExpandableContent() ? TicketHistoryItemComponent.descriptionLineClamp : null,
  );
  protected readonly hasExpandableContent = computed<boolean>(() => {
    switch (this.historyItem().type) {
      case TicketHistoryItemType.TRANSFER_IN_PROGRESS:
        return true;
      case TicketHistoryItemType.TRANSFER_COMPLETED:
        return this.transferUser() !== null;
      case TicketHistoryItemType.CREATED:
        return false;
      default:
        return this.isCodeHistoryItem() && (this.validatorLabel() !== null || this.profile() !== null);
    }
  });
  protected readonly isLoading = signal<boolean>(false);
  protected readonly isResendingEmail = signal<boolean>(false);

  protected openCancelTransferDialog(): void {
    const transferIntent = this.transferIntent();
    if (!transferIntent || this.isLoading() || this.isResendingEmail()) {
      return;
    }

    const dialogRef = this.#dialogService.openModal<CancelTransferConfirmModalResult, CancelTransferConfirmModalData>(
      CancelTransferConfirmModalComponent,
      {
        data: {
          acceptLabel: this.#translate.instant('validateTicketsNew.ticketHistory.cancelTransferModalYesButton'),
          cancelLabel: this.#translate.instant('validateTicketsNew.ticketHistory.cancelTransferModalNoButton'),
          message: [
            this.#translate.instant('validateTicketsNew.ticketHistory.cancelTransferModalMessage'),
            this.#translate.instant('validateTicketsNew.ticketHistory.cancelTransferModalMessageDescription'),
          ].join('\n\n'),
          title: this.#translate.instant('validateTicketsNew.ticketHistory.cancelTransfer'),
        },
      },
    );

    dialogRef.closed$
      .pipe(
        filter((result): result is CancelTransferConfirmModalResult => result?.confirmed === true),
        take(1),
        tap(() => this.isLoading.set(true)),
        switchMap(() => this.#revokeTransferIntent(transferIntent.id)),
        tap(() => {
          this.#toastService.add({
            autoHide: true,
            message: this.#translate.instant('validateTicketsNew.ticketHistory.cancelTransferSuccessMessage'),
            sentiment: AlertSentiment.positive,
            title: this.#translate.instant('validateTicketsNew.ticketHistory.transferCancelled'),
          });
          this.ticketUpdated.emit();
        }),
        catchError(() => {
          this.#toastService.add({
            autoHide: true,
            message: this.#translate.instant('errors.generic'),
            sentiment: AlertSentiment.danger,
            title: this.#translate.instant('common.errorTitle'),
          });
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  protected resendTransferEmail(): void {
    const transferIntent = this.transferIntent();
    if (!transferIntent || this.isLoading() || this.isResendingEmail()) {
      return;
    }

    this.isResendingEmail.set(true);

    this.#ticketTransferService
      .resendEmail(transferIntent.id)
      .pipe(
        tap(() => {
          this.#toastService.add({
            autoHide: true,
            message: this.#translate.instant('validateTicketsNew.ticketHistory.resendTransferEmailSuccessMessage'),
            sentiment: AlertSentiment.positive,
            title: this.#translate.instant('validateTicketsNew.ticketHistory.transferResent'),
          });
          this.ticketUpdated.emit();
        }),
        catchError(() => {
          this.#toastService.add({
            autoHide: true,
            message: this.#translate.instant('errors.generic'),
            sentiment: AlertSentiment.danger,
            title: this.#translate.instant('common.errorTitle'),
          });
          return EMPTY;
        }),
        finalize(() => this.isResendingEmail.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #revokeTransferIntent(transferIntentId: number): Observable<void> {
    return this.#ticketTransferService.revoke(transferIntentId);
  }
}
