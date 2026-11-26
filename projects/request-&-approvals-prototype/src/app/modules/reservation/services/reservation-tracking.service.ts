import { Injectable } from '@angular/core';

import {
  LoadReservationConfirmationData,
  LoadReservationConfirmationEvent,
} from '@fz-original/app/core/tracking/core/events/load-reservation-confirmation';
import {
  ReservationBusinessSelectedData,
  ReservationBusinessSelectedEvent,
} from '@fz-original/app/core/tracking/core/events/reservation-business-selected';
import {
  ReservationFlowStartedData,
  ReservationFlowStartedEvent,
} from '@fz-original/app/core/tracking/core/events/reservation-flow-started';
import {
  ReservationPlanSelectedData,
  ReservationPlanSelectedEvent,
} from '@fz-original/app/core/tracking/core/events/reservation-plan-selected';
import { TrackingEvent } from '@fz-original/app/core/tracking/tracking-event';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';

@Injectable({ providedIn: 'root' })
export class ReservationTrackingService {
  constructor(
    private userService: UserService,
    private trackingService: TrackingService,
  ) {}

  private trackEvent<T, E extends TrackingEvent<T>>(EventClass: new (data: T) => E, eventData: Partial<T>): void {
    const enrichedEvent: T = {
      ...eventData,
      reservation_flow_type: this.userService.getReservationFlowType(),
    } as T;

    this.trackingService.track(new EventClass(enrichedEvent));
  }

  trackLoadReservationConfirmationEvent(event: Partial<LoadReservationConfirmationData>): void {
    this.trackEvent(LoadReservationConfirmationEvent, event);
  }

  trackReservationBusinessSelected(event: Partial<ReservationBusinessSelectedData> = {}): void {
    this.trackEvent(ReservationBusinessSelectedEvent, event);
  }

  trackReservationFlowStarted(event: Partial<ReservationFlowStartedData> = {}): void {
    this.trackEvent(ReservationFlowStartedEvent, event);
  }

  trackReservationPlanSelected(event: Partial<ReservationPlanSelectedData> = {}): void {
    this.trackEvent(ReservationPlanSelectedEvent, event);
  }
}
