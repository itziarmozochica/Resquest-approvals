import { Component, inject } from '@angular/core';

import { FzTrackingService } from '@fz/fz-tracking/src/public-api';

import { createNewEvent } from '../../../modules/plan/tracking/events/create-new-event.event';
import { planTrackingProvider } from '../../../modules/plan/tracking/plan.tracking-provider';
import { CreateEventEntryService } from '../create-event-entry/create-event-entry.service';

@Component({
  providers: [...planTrackingProvider()],
  selector: 'app-create-new-event',
  standalone: false,
  templateUrl: './create-new-event.component.html',
})
export class CreateNewEventComponent {
  readonly #createEventEntry = inject(CreateEventEntryService);
  readonly #fzTracking = inject(FzTrackingService);

  handleCreateNewEvent(): void {
    this.#fzTracking.track(createNewEvent({ entry_point: this.#createEventEntry.getEntryPoint() }));
    this.#createEventEntry.handleHeaderCreateEvent();
  }
}
