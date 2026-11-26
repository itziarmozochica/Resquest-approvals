import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

import { BehaviorSubject, fromEvent, merge, NEVER, Observable, ReplaySubject, Subject } from 'rxjs';
import { debounceTime, first, mergeMap, switchMap, takeUntil, tap } from 'rxjs/operators';

import { SeatingMapState } from '../../../models/seating-map/seating-map.model';
import { PartnerService } from '../../../services/partner/partner.service';
import { ExpireHoldTokenService } from '../../services/expire-hold-token/expire-hold-token.service';
import { SeatingSelectorCartErrorMessage } from '../../services/seating-selector-messenger/messages/cart-error-message';
import { SeatingSelectorDeleteOrderMessage } from '../../services/seating-selector-messenger/messages/delete-order-message';
import {
  SEATING_SELECTOR_EXTERNAL_ITEM_SELECTED_TYPE,
  SeatingSelectorExternalItemSelectedMessagePayload,
} from '../../services/seating-selector-messenger/messages/external-item-selected-message';
import { SEATING_SELECTOR_EXTERNAL_ITEM_UNSELECTED_TYPE } from '../../services/seating-selector-messenger/messages/external-item-unselected-message';
import { SeatingSelectorInitializeMessage } from '../../services/seating-selector-messenger/messages/initialize-message';
import {
  ExternalItem,
  RealTimeSelection,
  RealTimeSelectionChangeReason,
  SEATING_SELECTOR_REAL_TIME_SELECTION_CHANGE_TYPE,
} from '../../services/seating-selector-messenger/messages/real-time-selection-change-message';
import { SEATING_SELECTOR_RELEASE_COMPLETED_TYPE } from '../../services/seating-selector-messenger/messages/release-completed-message';
import { SeatingSelectorReleaseSeatsByReferenceMessage } from '../../services/seating-selector-messenger/messages/release-seats-by-reference-message';
import { SeatingSelectorReleaseSeatsMessage } from '../../services/seating-selector-messenger/messages/release-seats-message';
import { SeatingSelectorRequestFinishedMessage } from '../../services/seating-selector-messenger/messages/request-finish-message';
import { SEATING_SELECTOR_SEAT_ADDED_TYPE } from '../../services/seating-selector-messenger/messages/seats-added-message';
import { SEATING_SELECTOR_FINALIZED_MESSAGE_TYPE } from '../../services/seating-selector-messenger/messages/seats-finalized-message';
import { SEATING_SELECTOR_SEATS_ORDER_EXPIRED_TYPE } from '../../services/seating-selector-messenger/messages/seats-order-expired-message';
import { SEATING_SELECTOR_SEAT_REMOVED_TYPE } from '../../services/seating-selector-messenger/messages/seats-removed-message';
import { SEATING_SELECTOR_SEATS_SELECTED_ID } from '../../services/seating-selector-messenger/messages/seats-selected-message';
import { SEATING_SELECTOR_SEATS_SELECTION_CHANGE_ID } from '../../services/seating-selector-messenger/messages/seats-selection-change-message';
import { SEATING_SELECTOR_SEATS_UNSELECTED_ID } from '../../services/seating-selector-messenger/messages/seats-unselected-message';
import { SEATING_SELECTOR_SESSION_EXPIRED_ID } from '../../services/seating-selector-messenger/messages/session-expired-message';
import { SEATING_SELECTOR_SESSION_STARTED } from '../../services/seating-selector-messenger/messages/session-started';
import { SeatingSelectorMessage } from '../../services/seating-selector-messenger/seating-selector-message';
import { SeatingSelectorMessenger } from '../../services/seating-selector-messenger/seating-selector-messenger';
import { SeatingSelectorMessengerService } from '../../services/seating-selector-messenger/seating-selector-messenger.service';

@Component({
  selector: 'app-seating-selector-wrapper',
  standalone: false,
  templateUrl: './seating-selector-wrapper.component.html',
  styleUrls: ['./seating-selector-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeatingSelectorWrapperComponent implements OnInit, OnDestroy {
  static readonly REAL_TIME_SELECTION_GRACE_MS = 250;

  @ViewChild('seatingSelectorIframe', { read: ElementRef, static: true }) iframe!: ElementRef<HTMLIFrameElement>;

  private urlInput = new ReplaySubject<string>(1);
  @Input() set url(value: string) {
    if (value) {
      this.urlInput.next(value);
    }
  }

  private stateInput = new ReplaySubject<SeatingMapState>(1);
  #latestState: SeatingMapState | null = null;
  @Input() set state(value: SeatingMapState) {
    if (value) {
      this.#updateRealTimeMode(value);
      this.#latestState = value;
      this.stateInput.next(value);
    }
  }

  private clearInput = new BehaviorSubject<Observable<boolean>>(NEVER as Observable<boolean>);
  @Input() set clearSelection(value: Observable<boolean>) {
    if (value) {
      this.clearInput.next(value);
    }
  }
  @Input() locale!: string;
  @Output() update = new EventEmitter<SeatingSelectorMessage<unknown>>();
  @Output() iframeInteraction: EventEmitter<void> = new EventEmitter<void>();

  iframeUrl!: string;
  private seatingSelectorMessenger!: SeatingSelectorMessenger;
  private destroy$ = new Subject<void>();
  #isRealTime = false;
  #realTimeItems: ExternalItem[] = [];
  #realTimeHoldToken: string | null = null;
  #lastRealTimeSelectionKey: string | null = null;
  readonly #realTimeSelectionChanged = new Subject<void>();
  readonly #realTimeMessageTypes = [
    SEATING_SELECTOR_EXTERNAL_ITEM_SELECTED_TYPE,
    SEATING_SELECTOR_EXTERNAL_ITEM_UNSELECTED_TYPE,
    SEATING_SELECTOR_SEATS_ORDER_EXPIRED_TYPE,
  ];

  readonly #partnerService = inject(PartnerService);
  readonly #expireHoldTokenService = inject(ExpireHoldTokenService);

  constructor(private seatingSelectorMessengerService: SeatingSelectorMessengerService) {
    this.#realTimeSelectionChanged
      .pipe(debounceTime(SeatingSelectorWrapperComponent.REAL_TIME_SELECTION_GRACE_MS), takeUntil(this.destroy$))
      .subscribe(() => this.#emitRealTimeSelection('change'));
  }

  ngOnDestroy(): void {
    this.iframeInteraction.complete();
    this.destroy$.next();
  }

  ngOnInit(): void {
    this.initializeSeatingMap();
    this.initializeClearInput();
  }
  initialize(state: unknown): void {
    this.seatingSelectorMessenger?.send(new SeatingSelectorInitializeMessage({ state, locale: this.locale }));
  }

  reInitialize(): void {
    if (this.#latestState) {
      this.seatingSelectorMessenger?.send(new SeatingSelectorInitializeMessage({ state: this.#latestState, locale: this.locale }));
    }
  }

  finish(): void {
    this.seatingSelectorMessenger?.send(new SeatingSelectorRequestFinishedMessage());
  }

  release(): void {
    if (this.#isRealTime) {
      this.deleteOrder();
      this.#emitReleaseCompleted();
      return;
    }
    this.seatingSelectorMessenger?.send(new SeatingSelectorReleaseSeatsMessage());
  }

  /**
   * Classic maps release the given seats. A real-time (OneBox) map has no partial release: the basket
   * is deleted when the references cover every held entry, and the call does nothing otherwise.
   */
  releaseSeatsByReference(seatReferences: string[]): void {
    if (seatReferences.length === 0) {
      return;
    }
    if (this.#isRealTime) {
      if (this.#coversRealTimeSelection(seatReferences)) {
        this.deleteOrder();
      }
      return;
    }
    this.seatingSelectorMessenger?.send(new SeatingSelectorReleaseSeatsByReferenceMessage({ seatReferences }));
  }

  /** Deletes the OneBox basket of a real-time map. Classic maps have no order to delete: no-op. */
  deleteOrder(): void {
    if (!this.#isRealTime) {
      return;
    }
    this.seatingSelectorMessenger?.send(new SeatingSelectorDeleteOrderMessage());
    this.#clearRealTimeSelection();
    this.#emitRealTimeSelection('change');
  }

  sendCartError(): void {
    this.seatingSelectorMessenger?.send(new SeatingSelectorCartErrorMessage());
  }

  end(): void {
    this.seatingSelectorMessenger?.end();
  }

  private initializeSeatingMap() {
    this.urlInput
      .pipe(
        tap(url => {
          this.iframeUrl = url;
        }),
        switchMap(() => {
          return fromEvent(this.iframe.nativeElement, 'load').pipe(first());
        }),
        mergeMap(() => {
          this.setMessageListeners();
          return this.stateInput;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(state => {
        this.seatingSelectorMessenger?.send(new SeatingSelectorInitializeMessage({ state, locale: this.locale }));
      });
  }

  private initializeClearInput() {
    this.clearInput
      .pipe(
        switchMap(clear => clear),
        takeUntil(this.destroy$),
      )
      .subscribe((expireHoldToken: boolean) => {
        if (this.#isRealTime) {
          this.release();
          return;
        }
        if (expireHoldToken) {
          this.#expireHoldTokenViaBackend();
          this.#emitReleaseCompleted();
        } else {
          this.release();
        }
      });
  }

  private setMessageListeners(): void {
    this.seatingSelectorMessenger = this.seatingSelectorMessengerService.create();
    const contentWindow = this.iframe.nativeElement.contentWindow;
    if (!contentWindow) {
      return;
    }
    this.seatingSelectorMessenger.init(contentWindow);

    merge(
      ...[
        SEATING_SELECTOR_SEATS_SELECTED_ID,
        SEATING_SELECTOR_SEATS_SELECTION_CHANGE_ID,
        SEATING_SELECTOR_SEATS_UNSELECTED_ID,
        SEATING_SELECTOR_SEAT_ADDED_TYPE,
        SEATING_SELECTOR_SEAT_REMOVED_TYPE,
        SEATING_SELECTOR_SESSION_STARTED,
        SEATING_SELECTOR_FINALIZED_MESSAGE_TYPE,
        SEATING_SELECTOR_SESSION_EXPIRED_ID,
        SEATING_SELECTOR_RELEASE_COMPLETED_TYPE,
        ...this.#realTimeMessageTypes,
      ].map(id => this.seatingSelectorMessenger.listen(id)),
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        if (this.#realTimeMessageTypes.includes(message.type)) {
          this.#onRealTimeMessage(message);
          return;
        }
        if (this.#isRealTime && message.type === SEATING_SELECTOR_SEATS_UNSELECTED_ID) {
          this.#clearRealTimeSelection();
          this.#scheduleRealTimeSelection();
        }
        this.update.emit(message);
        this.iframeInteraction.emit();
      });
  }

  #clearRealTimeSelection(): void {
    this.#realTimeItems = [];
    this.#realTimeHoldToken = null;
  }

  #coversRealTimeSelection(seatReferences: string[]): boolean {
    if (this.#realTimeItems.length === 0) {
      return false;
    }
    const releasedCounts = new Map<string, number>();
    seatReferences.forEach(reference => releasedCounts.set(reference, (releasedCounts.get(reference) ?? 0) + 1));
    const heldCounts = new Map<string, number>();
    this.#realTimeItems.forEach(item => heldCounts.set(item.seatReference, (heldCounts.get(item.seatReference) ?? 0) + item.itemCount));
    return [...heldCounts].every(([reference, count]) => (releasedCounts.get(reference) ?? 0) >= count);
  }

  #emitRealTimeSelection(reason: RealTimeSelectionChangeReason): void {
    const selection: RealTimeSelection = { holdToken: this.#realTimeHoldToken, items: [...this.#realTimeItems], reason };
    const selectionKey = this.#realTimeSelectionKey();
    if (reason === 'change' && selectionKey === this.#lastRealTimeSelectionKey) {
      return;
    }
    this.#lastRealTimeSelectionKey = selectionKey;
    this.update.emit({ payload: selection, type: SEATING_SELECTOR_REAL_TIME_SELECTION_CHANGE_TYPE });
  }

  #emitReleaseCompleted(): void {
    this.update.emit({ payload: null, type: SEATING_SELECTOR_RELEASE_COMPLETED_TYPE });
  }

  #expireHoldTokenViaBackend(): void {
    const state = this.#latestState;
    const partnerId = this.#partnerService.getPartner()?.id;
    if (!state?.hold_token || !state.seating_provider || !partnerId) {
      return;
    }
    this.#expireHoldTokenService.expireHoldToken(partnerId, {
      hold_token: state.hold_token,
      provider_public_key: state.provider_public_key,
      seating_provider: state.seating_provider,
    });
  }

  #onRealTimeMessage(message: SeatingSelectorMessage<unknown>): void {
    if (!this.#isRealTime) {
      return;
    }
    if (message.type === SEATING_SELECTOR_EXTERNAL_ITEM_SELECTED_TYPE) {
      const { holdToken, itemCount, itemPrice, seatLabel, seatReference } =
        message.payload as SeatingSelectorExternalItemSelectedMessagePayload;
      this.#realTimeItems = [...this.#realTimeItems, { itemCount, itemPrice, seatLabel, seatReference }];
      this.#realTimeHoldToken = holdToken ?? this.#realTimeHoldToken;
      this.#scheduleRealTimeSelection();
    } else if (message.type === SEATING_SELECTOR_SEATS_ORDER_EXPIRED_TYPE) {
      this.#clearRealTimeSelection();
      this.#emitRealTimeSelection('expired');
    }
    this.iframeInteraction.emit();
  }

  #realTimeSelectionKey(): string {
    return JSON.stringify({ holdToken: this.#realTimeHoldToken, items: this.#realTimeItems });
  }

  #resetRealTimeSelection(): void {
    this.#clearRealTimeSelection();
    this.#lastRealTimeSelectionKey = this.#realTimeSelectionKey();
  }

  #scheduleRealTimeSelection(): void {
    this.#realTimeSelectionChanged.next();
  }

  #updateRealTimeMode(state: SeatingMapState): void {
    if (this.#latestState?.session_id !== state.session_id) {
      this.#resetRealTimeSelection();
    }
    this.#isRealTime = state.is_real_time === true;
  }
}
