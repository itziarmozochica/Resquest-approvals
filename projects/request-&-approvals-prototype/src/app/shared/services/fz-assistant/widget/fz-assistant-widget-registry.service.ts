import { inject, Injectable } from '@angular/core';

import { FzAssistantCapable } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';
import { FzAssistantWidgetRegistry } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-discover.model';

import { FzAssistantRefRegistryService } from '../discover/fz-assistant-ref-registry.service';

@Injectable({
  providedIn: 'root',
})
export class FzAssistantWidgetRegistryService implements FzAssistantWidgetRegistry {
  readonly #refs = inject(FzAssistantRefRegistryService);
  readonly #widgets = new Map<Element, FzAssistantCapable>();

  get(element: Element): FzAssistantCapable | undefined {
    return this.#widgets.get(element);
  }

  register(element: Element, capable: FzAssistantCapable): void {
    this.#widgets.set(element, capable);
  }

  unregister(element: Element): void {
    this.#widgets.delete(element);
    this.#refs.clearElement(element);
  }
}
