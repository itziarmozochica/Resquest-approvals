import { EnvironmentInjector, inject, Injectable } from '@angular/core';

import { IgntDialogService } from '@ignite/common';
import { Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';

import { CreateEventDuplicateModalComponent } from '../components/create-event-duplicate-modal/create-event-duplicate-modal.component';
import { type CreateEventDuplicateModalResult } from '../components/create-event-duplicate-modal/create-event-duplicate-modal.model';
import { type CreateEventQuickSetupWizardCloseResult } from '../components/create-event-quick-setup-wizard/create-event-quick-setup-wizard.model';
import { openCreateEventQuickSetupWizard } from '../components/create-event-quick-setup-wizard/open-create-event-quick-setup-wizard.util';
import { CreateEventSetupModalComponent } from '../components/create-event-setup-modal/create-event-setup-modal.component';
import { type CreateEventSetupModalResult } from '../components/create-event-setup-modal/create-event-setup-modal.model';
import { CreateEventTypeSelectorModalComponent } from '../components/create-event-type-selector-modal/create-event-type-selector-modal.component';
import { CreateEventType } from '../create-event.model';
import { QuickSetupEventType } from '../models/quick-setup-form.model';
import { CreateEventTypeService } from './create-event-type.service';

@Injectable({ providedIn: 'root' })
export class CreateEventFlowService {
  readonly #createEventTypeService = inject(CreateEventTypeService);
  readonly #dialogService = inject(IgntDialogService);
  readonly #environmentInjector = inject(EnvironmentInjector);
  readonly #openSidebarRequested$ = new Subject<CreateEventType | null>();
  readonly openSidebarRequested$: Observable<CreateEventType | null> = this.#openSidebarRequested$.asObservable();
  #isFlowModalOpen = false;

  startFlow(): void {
    if (this.#isFlowModalOpen) {
      return;
    }

    const availableTypes = this.#createEventTypeService.getAvailableTypes();

    if (availableTypes.length === 1) {
      this.#onTypeSelected(availableTypes[0]);
      return;
    }

    this.#openTypeSelector();
  }

  #onTypeSelected(type: CreateEventType): void {
    this.#openSetupModal(type);
  }

  #openDuplicateModal(eventType: CreateEventType): void {
    this.#isFlowModalOpen = true;

    const duplicateRef = this.#dialogService.openModal<CreateEventDuplicateModalResult>(CreateEventDuplicateModalComponent, {
      data: { eventType },
      injector: this.#environmentInjector,
      size: 'lg',
    });

    duplicateRef.closed$.pipe(take(1)).subscribe((result: CreateEventDuplicateModalResult | undefined) => {
      this.#isFlowModalOpen = false;

      if (result === 'back') {
        this.#openSetupModal(eventType);
      }
    });
  }

  #openQuickSetupWizard(eventType: QuickSetupEventType): void {
    this.#isFlowModalOpen = true;

    const wizardRef = openCreateEventQuickSetupWizard(this.#dialogService, this.#environmentInjector, { eventType });

    wizardRef.closed$.pipe(take(1)).subscribe((result: CreateEventQuickSetupWizardCloseResult | null | undefined) => {
      this.#isFlowModalOpen = false;

      if (result === 'back') {
        this.#openSetupModal(eventType);
      }
    });
  }

  #openSetupModal(eventType: CreateEventType): void {
    this.#isFlowModalOpen = true;

    const setupRef = this.#dialogService.openModal<CreateEventSetupModalResult>(CreateEventSetupModalComponent, {
      data: { eventType, showQuickSetup: eventType === 'standard' },
      injector: this.#environmentInjector,
      size: 'lg',
    });

    setupRef.closed$.pipe(take(1)).subscribe((result: CreateEventSetupModalResult | undefined) => {
      this.#isFlowModalOpen = false;

      if (result === 'advanced-setup') {
        this.#openSidebarRequested$.next(eventType);
        return;
      }

      if (result === 'quick-setup') {
        this.#openQuickSetupWizard(eventType as QuickSetupEventType);
        return;
      }

      if (result === 'duplicate-event') {
        this.#openDuplicateModal(eventType);
      }
    });
  }

  #openTypeSelector(): void {
    this.#isFlowModalOpen = true;

    const selectorRef = this.#dialogService.openModal<CreateEventType | null>(CreateEventTypeSelectorModalComponent, {
      data: { types: this.#createEventTypeService.getAvailableTypeConfigs() },
      injector: this.#environmentInjector,
      size: 'lg',
    });

    selectorRef.closed$.pipe(take(1)).subscribe((result: CreateEventType | null | undefined) => {
      if (!result) {
        this.#isFlowModalOpen = false;
        return;
      }

      this.#onTypeSelected(result);
    });
  }
}
