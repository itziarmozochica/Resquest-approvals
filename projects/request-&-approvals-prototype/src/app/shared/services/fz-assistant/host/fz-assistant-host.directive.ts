import { DestroyRef, Directive, ElementRef, inject, input, OnInit } from '@angular/core';

import { FzAssistantHostConfig, FzAssistantRegisteredHost } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-host.model';

import { FzAssistantRefRegistryService } from '../discover/fz-assistant-ref-registry.service';
import { FzAssistantHostRegistryService } from './fz-assistant-host-registry.service';

@Directive({
  selector: '[fzAssistantHost]',
  standalone: true,
})
export class FzAssistantHostDirective implements OnInit {
  readonly #destroyRef = inject(DestroyRef);
  readonly #elementRef = inject(ElementRef);
  readonly #hostRegistry = inject(FzAssistantHostRegistryService);
  #registeredHost: FzAssistantRegisteredHost | undefined = undefined;
  readonly #refRegistry = inject(FzAssistantRefRegistryService);

  readonly fzAssistantHost = input.required<FzAssistantHostConfig>();

  constructor() {
    this.#destroyRef.onDestroy(() => {
      if (this.#registeredHost !== undefined) {
        this.#hostRegistry.unregister(this.#registeredHost);
        this.#registeredHost = undefined;
      }

      this.#refRegistry.clearSubtree(this.#elementRef.nativeElement as HTMLElement);
    });
  }

  ngOnInit(): void {
    // Register after required input binding so live config getters never hit NG0950 if
    // register (or a future caller) reads viewId/actions during construction.
    this.#registeredHost = {
      config: createLiveFzAssistantHostConfig(() => this.fzAssistantHost()),
      element: this.#elementRef.nativeElement as HTMLElement,
    };
    this.#hostRegistry.register(this.#registeredHost);
  }
}

function createLiveFzAssistantHostConfig(readConfig: () => FzAssistantHostConfig): FzAssistantHostConfig {
  return {
    get actions() {
      return readConfig().actions;
    },
    get requireConfirmationFor() {
      return readConfig().requireConfirmationFor;
    },
    get submit() {
      return readConfig().submit;
    },
    get submitEnabled() {
      return readConfig().submitEnabled;
    },
    get viewId() {
      return readConfig().viewId;
    },
    get viewState() {
      return readConfig().viewState;
    },
  };
}
