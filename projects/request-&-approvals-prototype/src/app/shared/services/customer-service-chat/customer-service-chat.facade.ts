import { createEnvironmentInjector, EnvironmentInjector, inject, Injectable } from '@angular/core';

import { FzTrackingService } from '@fz/fz-tracking/src/public-api';

import { ZendeskService } from '../script-loader/zendesk/zendesk.service';
import { customerServiceChatTrackingProvider } from './tracking/customer-service-chat.tracking-provider';
import { openCustomerServiceChat, type CustomerServiceChatEntrypoint } from './tracking/events/open-customer-service-chat.event';

/**
 * The one way to open the Zendesk messenger, so every entry point lands in Mixpanel as the same
 * `opened_customer_service_chat` event with its own `entry_point`.
 *
 * The entry points live in unrelated subtrees (the header, the FZ Assistant, the shell's profile
 * menu), and registering the mappers on any of their hosts would shadow `FzTrackingService` for
 * everything below. A child environment injector keeps the mappers scoped to this facade alone.
 */
@Injectable({
  providedIn: 'root',
})
export class CustomerServiceChatFacade {
  readonly #tracking = createEnvironmentInjector(customerServiceChatTrackingProvider(), inject(EnvironmentInjector)).get(FzTrackingService);
  readonly #zendeskService = inject(ZendeskService);

  open(entrypoint: CustomerServiceChatEntrypoint): void {
    // The hand-off goes first: a throwing tracking adapter must never leave the user on a dead button.
    this.#zendeskService.openMessenger();
    this.#tracking.track(openCustomerServiceChat({ entrypoint }));
  }
}
