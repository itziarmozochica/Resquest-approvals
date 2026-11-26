import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormatDatePipe } from '@fz-original/app/app/pipes/format-date.pipe';
import { IgntButtonComponent, IgntButtonIcon } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { PermissionBaseModule } from '../../../../../directives/permission-based/permission-base.module';
import { TransferIntent } from '../../../../../models/cart/transfer-intent.model';
import { AccessTicketWithCode } from '../../../../../models/order/access-ticket.model';
import { CodeTypeTranslationKeyPipe } from '../../../../../pipes/code-type-translation-key/code-type-translation-key.pipe';
import { Permissions } from '../../../../../services/user/permissions';
import { UserService } from '../../../../../services/user/user.service';
import { getScrollContainer } from '../../../../../utils/scroll-container.util';
import { OrderResponsesLinkComponent } from '../../order-responses-link/order-responses-link.component';
import { TicketHistoryItem } from '../ticket-history/ticket-history-item';
import { sortTicketHistoryItems } from '../ticket-history/ticket-history-item.util';
import { TicketHistoryComponent } from '../ticket-history/ticket-history.component';
import { TicketHistoryService } from './ticket-history.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CodeTypeTranslationKeyPipe,
    FormatDatePipe,
    IgntButtonComponent,
    IgntIconComponent,
    OrderResponsesLinkComponent,
    PermissionBaseModule,
    TicketHistoryComponent,
    TranslateModule,
  ],
  selector: 'app-ticket-detail',
  standalone: true,
  styleUrl: './ticket-detail.component.scss',
  templateUrl: './ticket-detail.component.html',
})
export class TicketDetailComponent implements OnInit {
  ticket = input.required<AccessTicketWithCode>();
  isEntryPass = input<boolean>(false);
  orderId = input<number | null>(null);
  sessionTimezone = input<string | null>(null);
  ticketIndex = input<number | null>(null);
  transferIntent = input<TransferIntent | null>(null);

  ticketUpdated = output<void>();

  readonly #destroyRef = inject(DestroyRef);
  readonly #ticketHistoryService = inject(TicketHistoryService);
  readonly #userService = inject(UserService);

  protected readonly retryIcon: IgntButtonIcon = { name: 'redo', variant: 'solid' };
  protected readonly ticketHistoryPermissions: Permissions[] = [Permissions.CAN_VIEW_VALIDATE, Permissions.CAN_VIEW_BOX_OFFICE];

  protected readonly loadMoreSentinel = viewChild<ElementRef<HTMLElement>>('loadMoreSentinel');

  protected readonly ticketHistory = signal<TicketHistoryItem[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly hasMorePages = signal<boolean>(true);
  protected readonly hasError = signal<boolean>(false);
  protected readonly isInitialLoading = computed<boolean>(() => this.isLoading() && this.ticketHistory().length === 0);
  protected readonly isLoadingMore = computed<boolean>(() => this.isLoading() && this.ticketHistory().length > 0);
  protected readonly errorMessageKey = computed<string>(() =>
    this.ticketHistory().length === 0 ? 'validateTicketsNew.ticketHistory.loadError' : 'validateTicketsNew.ticketHistory.loadMoreError',
  );
  readonly #nextRequestCursor = signal<string | null>(null);
  #isHistoryRequested = false;

  constructor() {
    effect(onCleanup => {
      const sentinel = this.loadMoreSentinel()?.nativeElement;
      if (!sentinel) {
        return;
      }
      const observer = new IntersectionObserver(
        entries => {
          if (entries.some(entry => entry.isIntersecting) && !this.isLoading() && this.hasMorePages()) {
            this.#fetchPage();
          }
        },
        { root: getScrollContainer(sentinel), rootMargin: '200px' },
      );
      observer.observe(sentinel);
      onCleanup(() => observer.disconnect());
    });
  }

  ngOnInit(): void {
    this.#userService
      .observePermissions()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        if (!this.#isHistoryRequested && this.#hasTicketHistoryPermission()) {
          this.#isHistoryRequested = true;
          this.#fetchPage();
        }
      });
  }

  protected retryLoading(): void {
    this.hasError.set(false);
    this.#fetchPage();
  }

  #hasTicketHistoryPermission(): boolean {
    return this.ticketHistoryPermissions.some(permission => this.#userService.hasPermission(permission));
  }

  #fetchPage(): void {
    if (this.isLoading()) {
      return;
    }
    this.isLoading.set(true);

    this.#ticketHistoryService
      .getTicketHistoryPage({
        code: this.ticket().code,
        cursor: this.#nextRequestCursor(),
        transferIntent: this.transferIntent(),
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(page => {
        this.isLoading.set(false);
        const items = page.data;
        if (items === null) {
          this.hasError.set(true);
          return;
        }
        this.hasError.set(false);
        this.ticketHistory.update(history => sortTicketHistoryItems([...history, ...items]));
        this.#nextRequestCursor.set(page.getNextCursor());
        this.hasMorePages.set(page.hasNextPage());
      });
  }
}
