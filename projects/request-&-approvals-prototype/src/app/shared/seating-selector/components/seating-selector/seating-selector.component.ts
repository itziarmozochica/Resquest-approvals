import { Component, EventEmitter, Input, output, Output, ViewChild } from '@angular/core';

import { Subject } from 'rxjs';

import { SeatingMapState } from '../../../models/seating-map/seating-map.model';
import { Seat } from '../../../models/session-availability/seat.model';
import {
  RealTimeSelection,
  SEATING_SELECTOR_REAL_TIME_SELECTION_CHANGE_TYPE,
} from '../../services/seating-selector-messenger/messages/real-time-selection-change-message';
import { SEATING_SELECTOR_RELEASE_COMPLETED_TYPE } from '../../services/seating-selector-messenger/messages/release-completed-message';
import { SEATING_SELECTOR_SEAT_ADDED_TYPE } from '../../services/seating-selector-messenger/messages/seats-added-message';
import { SEATING_SELECTOR_FINALIZED_MESSAGE_TYPE } from '../../services/seating-selector-messenger/messages/seats-finalized-message';
import { SEATING_SELECTOR_SEAT_REMOVED_TYPE } from '../../services/seating-selector-messenger/messages/seats-removed-message';
import {
  SEATING_SELECTOR_SEATS_SELECTED_ID,
  SeatingSelectorSeatsSelectedMessagePayload,
} from '../../services/seating-selector-messenger/messages/seats-selected-message';
import { SEATING_SELECTOR_SEATS_SELECTION_CHANGE_ID } from '../../services/seating-selector-messenger/messages/seats-selection-change-message';
import { SEATING_SELECTOR_SEATS_UNSELECTED_ID } from '../../services/seating-selector-messenger/messages/seats-unselected-message';
import { SEATING_SELECTOR_SESSION_EXPIRED_ID } from '../../services/seating-selector-messenger/messages/session-expired-message';
import { SEATING_SELECTOR_SESSION_STARTED } from '../../services/seating-selector-messenger/messages/session-started';
import { SeatingSelectorMessage } from '../../services/seating-selector-messenger/seating-selector-message';
import { SeatingSelectorWrapperComponent } from '../seating-selector-wrapper/seating-selector-wrapper.component';
import { FreeSeatResponse } from './__data__/free-seat-response.model';
import { SeatInfo } from './__data__/seat-info.model';
import { SeatingSelectorFinalizedResponse } from './__data__/seating-selector-finalized-response.model';

type MessagePayloadTypes = RealTimeSelection | SeatingSelectorSeatsSelectedMessagePayload | void;

export interface ClearSelectionOptions {
  expireHoldToken?: boolean;
}

@Component({
  selector: 'seating-selector',
  standalone: false,
  templateUrl: './seating-selector.component.html',
  styleUrls: ['./seating-selector.component.scss'],
})
export class SeatingSelectorComponent {
  @ViewChild('seatingSelectorWrapper', { static: false, read: SeatingSelectorWrapperComponent })
  seatingSelectorWrapperRef: SeatingSelectorWrapperComponent | undefined;

  @Input() seatingMapUrl = '';
  @Input() state: SeatingMapState | null = null;
  @Input() locale = '';
  @Input() manageAsFreeSeatingMap = false;
  @Input() shouldRestoreToBeginning = false;
  @Input() shouldGoBack = false;
  @Input() showTopBar = true;
  @Output() selectSeats: EventEmitter<Seat | null> = new EventEmitter<Seat | null>();
  @Output() sessionExpired: EventEmitter<void> = new EventEmitter<void>();
  @Output() updateSeatsInCart: EventEmitter<FreeSeatResponse> = new EventEmitter<FreeSeatResponse>();
  @Output() confirmSeating: EventEmitter<SeatingSelectorFinalizedResponse> = new EventEmitter<SeatingSelectorFinalizedResponse>();
  @Output() continueRestore: EventEmitter<void> = new EventEmitter<void>();
  @Output() releaseCompleted: EventEmitter<void> = new EventEmitter<void>();
  @Output() iframeInteraction: EventEmitter<void> = new EventEmitter<void>();
  @Output() clearSelectionRequested: EventEmitter<void> = new EventEmitter<void>();
  readonly realTimeSelectionChange = output<RealTimeSelection>();
  /** The map finished (re-)initialising a session: the host may lift any wait it kept on the previous one. */
  readonly sessionStarted = output<void>();

  clearSelectionSubject = new Subject<boolean>();
  seatsCounter = 0;
  readonly numberFormat = '1.0-0';

  finishSeatingSelection(): void {
    this.seatingSelectorWrapperRef?.finish();
  }

  /** On a real-time map the basket is deleted only when the references cover every held entry (see the wrapper). */
  releaseSeatsByReference(seatReferences: string[]): void {
    if (seatReferences.length === 0) {
      return;
    }
    this.seatingSelectorWrapperRef?.releaseSeatsByReference(seatReferences);
  }

  deleteOrder(): void {
    this.seatingSelectorWrapperRef?.deleteOrder();
  }

  sendCartError(): void {
    this.seatingSelectorWrapperRef?.sendCartError();
  }

  seatingSelectorChange(message: SeatingSelectorMessage<MessagePayloadTypes>): void {
    const payload = message.payload as any;
    switch (message.type) {
      case SEATING_SELECTOR_SEATS_SELECTED_ID:
        this.selectSeats.emit(
          new Seat(payload.feverSeatingData.category, payload.feverSeatingData.seats, null, payload.feverSeatingData.hold_token),
        );
        break;
      case SEATING_SELECTOR_RELEASE_COMPLETED_TYPE:
        this.releaseCompleted.emit();
        if (this.shouldRestoreToBeginning || this.shouldGoBack) {
          this.continueRestore.emit();
        }
        break;
      case SEATING_SELECTOR_SEATS_SELECTION_CHANGE_ID:
        this.seatsCounter = payload.feverSeatingData.seats.length;
        break;
      case SEATING_SELECTOR_SEATS_UNSELECTED_ID:
        this.selectSeats.emit(null);
        break;
      case SEATING_SELECTOR_SESSION_EXPIRED_ID:
        this.selectSeats.emit(null);
        this.sessionExpired.emit();
        break;
      case SEATING_SELECTOR_SESSION_STARTED:
        this.sessionStarted.emit();
        break;
      case SEATING_SELECTOR_SEAT_ADDED_TYPE: {
        const seatInfo: SeatInfo = {
          seatReference: payload.seatReference,
          seatLabel: payload.seatLabel,
          displayedLabel: payload.displayedLabel,
        };
        this.updateSeatsInCart.emit({ sessionId: payload.sessionId, adding: true, seatInfo, holdToken: payload.holdToken });
        this.seatsCounter += 1;
        break;
      }
      case SEATING_SELECTOR_SEAT_REMOVED_TYPE: {
        const seatInfo: SeatInfo = { seatReference: payload.seatReference };
        this.updateSeatsInCart.emit({ sessionId: payload.sessionId, adding: false, seatInfo: seatInfo });
        this.seatsCounter -= 1;
        break;
      }
      case SEATING_SELECTOR_REAL_TIME_SELECTION_CHANGE_TYPE: {
        const selection = payload as RealTimeSelection;
        this.seatsCounter = selection.items.reduce((count, item) => count + item.itemCount, 0);
        this.realTimeSelectionChange.emit(selection);
        break;
      }
      case SEATING_SELECTOR_FINALIZED_MESSAGE_TYPE:
        this.confirmSeating.emit({ holdToken: payload.token });
    }
  }

  onUserClearSelection(): void {
    if (this.seatsCounter > 0) {
      this.clearSelectionRequested.emit();
    }
    this.clearSelection();
  }

  clearSelection(options?: ClearSelectionOptions): void {
    const expireHoldToken = options?.expireHoldToken ?? false;
    if (this.seatsCounter > 0) {
      this.clearSelectionSubject.next(expireHoldToken);
    }
  }

  onIframeInteraction(): void {
    this.iframeInteraction.emit();
  }
}
