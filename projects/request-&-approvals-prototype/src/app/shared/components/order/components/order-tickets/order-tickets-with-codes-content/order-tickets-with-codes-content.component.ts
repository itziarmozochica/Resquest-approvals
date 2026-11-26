import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  Signal,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormatDatePipe } from '@fz-original/app/app/pipes/format-date.pipe';
import { ValidationStatus } from '@fz-original/app/modules/validation/enums/validation-status.enum';
import { ScrollAndHighlightService } from '@fz-original/app/modules/validation/services/scroll-and-highlight/scroll-and-highlight.service';
import { TicketTransfer } from '@fz-original/app/shared/models/cart/cart-ticket-transfer.model';
import { TicketSelectionState } from '@fz-original/app/shared/utils/ticket-selection-state';
import { IgntButtonComponent, IgntDialogService, type IgntDialogRef } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntTagComponent, TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs';

import { PermissionBaseModule } from '../../../../../directives/permission-based/permission-base.module';
import { BookingAnswer } from '../../../../../models/booking-questions/booking-answer.model';
import { CartSession } from '../../../../../models/cart/cart-session.model';
import { TransferIntent, TransferIntentStatus } from '../../../../../models/cart/transfer-intent.model';
import { TransferTypeEnum } from '../../../../../models/cart/transfer-type.enum';
import { AccessTicket, AccessTicketWithCode, AccessTicketWithCodeAndTransferInfo } from '../../../../../models/order/access-ticket.model';
import { CodeType } from '../../../../../models/order/code-type.model';
import { PipesModule } from '../../../../../pipes/pipes.module';
import { resolveTicketIndex } from '../../order-responses-link/ticket-answer-index.util';
import { TicketCodeQrModalComponent, TicketCodeQrModalData } from '../ticket-code-qr-modal/ticket-code-qr-modal.component';
import { ticketCodeTransferIntent } from '../ticket-code-transfer-intent/ticket-code-transfer-intent';
import {
  TicketDetailSidePanelComponent,
  TicketDetailSidePanelData,
  TicketDetailSidePanelResult,
} from '../ticket-detail-side-panel/ticket-detail-side-panel.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    FormatDatePipe,
    TranslateModule,
    PermissionBaseModule,
    PipesModule,
    IgntTagComponent,
    IgntButtonComponent,
    IgntIconComponent,
    IgntIconButtonComponent,
  ],
  selector: 'app-order-tickets-with-codes-content',
  standalone: true,
  styleUrls: ['./order-tickets-with-codes-content.component.scss', '../../../styles/hightlight-animation.scss'],
  templateUrl: './order-tickets-with-codes-content.component.html',
})
export class OrderTicketsWithCodesContentComponent {
  session = input.required<CartSession>();
  tickets = input.required<Map<string, AccessTicketWithCode>, Map<string, AccessTicket>>({
    transform: tickets => tickets as Map<string, AccessTicketWithCode>,
  });
  ticketSelection = input.required<TicketSelectionState>();
  forceDisabled = input<boolean>(false);
  hiddenValidation = input<boolean>(false);
  lockTicketOnValidated = input<boolean>(true);
  orderBookingAnswers = input<BookingAnswer[] | undefined>(undefined);
  orderId = input<number | null>(null);
  searchedQRCode = input<string>();

  seeTicket = output<number>();
  showValidationHistory = output<string>();
  ticketUpdated = output<void>();

  protected codes = viewChildren<ElementRef<unknown>>('codes');
  protected readonly codeType = CodeType;
  protected readonly transfer: Signal<TicketTransfer | undefined> = computed<TicketTransfer | undefined>(() =>
    this.session().getTransfer(),
  );
  protected readonly filteredTickets: Signal<AccessTicketWithCodeAndTransferInfo[]> = computed<AccessTicketWithCodeAndTransferInfo[]>(
    () => {
      const ids = this.session().accessTicketIds ?? [];
      const transferedCodeIds =
        this.session()
          .ticketTransferIntents?.filter(intent => intent.status === 'claimed')
          ?.flatMap(intent => intent.codes.map(code => code.id.toString())) ?? [];
      const allIds = [...ids, ...transferedCodeIds];
      return allIds.reduce((accessTickets: AccessTicketWithCodeAndTransferInfo[], id: string) => {
        const ticket = this.tickets().get(id);
        if (!ticket || ticket.status === ValidationStatus.TRANSFERRED) {
          return accessTickets;
        }
        const status = transferedCodeIds.includes(id) ? ValidationStatus.TRANSFERRED : ticket?.status;
        ticket.status = status;
        const transferIntent = ticketCodeTransferIntent(ticket.code, this.session().ticketTransferIntents ?? []);
        const isResale = transferIntent ? this.#isAResaleIntent(transferIntent) : false;
        accessTickets.push({ ...ticket, transferInfo: { isResale, transferIntent } });
        return accessTickets;
      }, []);
    },
  );
  protected readonly sentimentByTransferIntentStatus: Record<TransferIntentStatus, TagSentiment> = {
    claimed: 'accent',
    pending: 'warning',
    revoked: 'danger',
  };
  protected readonly translationKeysByTransferIntentStatus: Partial<Record<TransferIntentStatus, string>> = {
    claimed: 'validateTicketsNew.labels.transferred',
    pending: 'validateTicketsNew.tickets.transferStatus.pending',
  };
  protected readonly validationStatusEnum = ValidationStatus;

  #scrollAndHighlight = inject(ScrollAndHighlightService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  #ticketDetailDialogRef: IgntDialogRef<TicketDetailSidePanelResult> | null = null;

  constructor() {
    this.#destroyRef.onDestroy(() => this.#tearDownTicketDetailPanel());

    effect(() => {
      const searchedQRCode = this.searchedQRCode();
      if (searchedQRCode) {
        this.#goToCode(searchedQRCode, this.codes());
      }
    });
  }

  clickOnValidationDate(code: string | undefined): void {
    if (!code) {
      return;
    }
    this.showValidationHistory.emit(code);
  }

  protected onCodeQrOpen(ticket: AccessTicketWithCode): void {
    this.#dialogService.openModal<void, TicketCodeQrModalData>(TicketCodeQrModalComponent, {
      data: { code: ticket.code, imageUrl: ticket.imageUrl ?? null },
      size: 'sm',
    });
  }

  protected onTicketDetailOpen(ticket: AccessTicketWithCodeAndTransferInfo): void {
    this.#ticketDetailDialogRef?.close();

    const session = this.session();
    const data: TicketDetailSidePanelData = {
      isEntryPass: session.sessionType?.isEntryPass ?? false,
      orderId: this.orderId(),
      sessionTimezone: session.sessionTimezone ?? null,
      ticket,
      ticketIndex: resolveTicketIndex(this.orderBookingAnswers(), Number(ticket.id)),
      transferIntent: ticket.transferInfo.transferIntent,
      onTicketUpdated: () => this.ticketUpdated.emit(),
    };

    this.#ticketDetailDialogRef = this.#dialogService.openSidePanel<TicketDetailSidePanelResult, TicketDetailSidePanelData>(
      TicketDetailSidePanelComponent,
      {
        data,
        injector: this.#injector,
      },
    );

    const openedRef = this.#ticketDetailDialogRef;
    openedRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      if (this.#ticketDetailDialogRef === openedRef) {
        this.#ticketDetailDialogRef = null;
      }
    });
  }

  #goToCode(code: string, codeElements: readonly ElementRef<unknown>[]): void {
    this.#scrollAndHighlight.scrollAndHighlight(codeElements, 'data-qrcode', code, 'highlight');
  }

  #isAResaleIntent(transferIntent: TransferIntent): boolean {
    return (this.session().transfers ?? []).some(
      transfer => transfer.id === String(transferIntent.ticketTransferId) && transfer.transferType === TransferTypeEnum.RESALE,
    );
  }

  #tearDownTicketDetailPanel(): void {
    this.#ticketDetailDialogRef?.close();
    this.#ticketDetailDialogRef = null;
  }
}
