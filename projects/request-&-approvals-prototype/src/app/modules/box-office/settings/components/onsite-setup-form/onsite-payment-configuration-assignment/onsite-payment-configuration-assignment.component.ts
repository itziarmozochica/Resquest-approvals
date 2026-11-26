import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  output,
  Output,
  Signal,
  signal,
  SimpleChanges,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { FilterSelectModule } from '@fz-original/app/shared/layout/filters/select/select.module';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY, Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import {
  OnsiteSetupPaymentConfiguration,
  OnsiteSetupPaymentConfigurationAssignment,
  OnsiteSetupPaymentConfigurationTerminal,
} from '../../../../shared/models/onsite-setup';
import {
  PaymentConfigurationDetail,
  PaymentConfigurationGatewayProvider,
  PaymentConfigurationTerminal,
} from '../../../../shared/models/payment-configuration';
import { PaymentConfigurationsService } from '../../../../shared/services/payment-configurations/payment-configurations.service';

interface TerminalOption {
  id: string;
  title: string;
}

export interface AssignedPaymentConfiguration {
  configuration: OnsiteSetupPaymentConfiguration | null;
  terminalIds: string[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterSelectModule, IgntButtonComponent, IgntCheckboxComponent, IgntIconComponent, TranslateModule],
  selector: 'app-onsite-payment-configuration-assignment',
  standalone: true,
  styleUrl: './onsite-payment-configuration-assignment.component.scss',
  templateUrl: './onsite-payment-configuration-assignment.component.html',
})
export class OnsitePaymentConfigurationAssignmentComponent implements OnChanges {
  static readonly PAGE_SIZE = 100;

  @Input() assigned: AssignedPaymentConfiguration = { configuration: null, terminalIds: [] };
  @Output() assignmentChange = new EventEmitter<OnsiteSetupPaymentConfigurationAssignment>();
  @Output() assignmentValidChange = new EventEmitter<boolean>();
  readonly paymentConfigurationsTabRequested = output<void>();
  @Input({ required: true }) placeId: number | null = null;
  @Input() saveAttempted = false;

  protected readonly configurationOptions: WritableSignal<SelectOption[]> = signal<SelectOption[]>([]);
  protected readonly configurationsLoaded: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly loadFailed: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly selectedConfigurationId: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly selectedConfigurationIsIntegrated: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly selectedConfigurationOption: WritableSignal<SelectOption | undefined> = signal<SelectOption | undefined>(undefined);
  protected readonly selectedTerminalIds: WritableSignal<string[]> = signal<string[]>([]);
  /** The place has finished loading its configurations and has none, so we point the user to the Payment configurations tab to create one. */
  protected readonly showPaymentConfigurationsTabLink: Signal<boolean> = computed(
    () => this.configurationsLoaded() && !this.loadFailed() && this.configurationOptions().length === 0,
  );
  protected readonly terminalOptions: WritableSignal<TerminalOption[]> = signal<TerminalOption[]>([]);
  protected readonly terminalsExpanded: WritableSignal<boolean> = signal<boolean>(true);
  protected readonly terminalsLoading: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly terminalsLoadFailed: WritableSignal<boolean> = signal<boolean>(false);

  readonly #destroyRef = inject(DestroyRef);
  readonly #loadConfigurations$ = new Subject<void>();
  readonly #paymentConfigurationsService = inject(PaymentConfigurationsService);
  #selectedConfigurationProvider: PaymentConfigurationGatewayProvider | null = null;

  constructor() {
    this.#loadConfigurations$
      .pipe(
        switchMap(() => {
          if (this.placeId === null) {
            this.configurationOptions.set([]);
            return EMPTY;
          }
          return this.#paymentConfigurationsService.getPaymentConfigurations({
            itemsPerPage: OnsitePaymentConfigurationAssignmentComponent.PAGE_SIZE,
            placeId: this.placeId,
          });
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(response => {
        this.configurationsLoaded.set(true);
        if (response.error !== null || response.data === null) {
          this.configurationOptions.set([]);
          this.loadFailed.set(true);
          return;
        }
        this.loadFailed.set(false);
        const options: SelectOption[] = response.data.map(configuration => ({ id: configuration.id, title: configuration.name }));
        this.configurationOptions.set(options);
        this.#reprojectSelectedConfigurationOption(options);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.placeId || changes.assigned) {
      this.configurationsLoaded.set(false);
      this.#loadConfigurations$.next();
    }
    if (changes.assigned) {
      this.#resetToAssigned();
    }
  }

  protected configurationRequiredError(): boolean {
    return this.saveAttempted && this.selectedConfigurationId() === null;
  }

  protected goToPaymentConfigurations(): void {
    this.paymentConfigurationsTabRequested.emit();
  }

  protected isTerminalSelected(terminalId: string): boolean {
    return this.selectedTerminalIds().includes(terminalId);
  }

  protected selectConfiguration(option?: SelectOption): void {
    const configurationId: string | null = option?.id ?? null;
    if (configurationId === this.selectedConfigurationId()) {
      return;
    }

    this.selectedConfigurationId.set(configurationId);
    this.selectedConfigurationOption.set(option?.id !== undefined ? option : undefined);
    this.terminalsExpanded.set(true);
    this.selectedTerminalIds.set([]);
    this.terminalOptions.set([]);
    this.terminalsLoadFailed.set(false);
    this.terminalsLoading.set(false);
    this.selectedConfigurationIsIntegrated.set(false);
    this.#selectedConfigurationProvider = null;

    if (configurationId === null) {
      this.#emitAssignment();
      return;
    }

    if (configurationId === this.assigned.configuration?.id) {
      const integratedGateway = this.assigned.configuration.integrated_gateway;
      const options: TerminalOption[] = this.#assignedTerminalsToOptions(integratedGateway?.terminals ?? []);
      this.selectedConfigurationIsIntegrated.set(integratedGateway !== null);
      this.#selectedConfigurationProvider = integratedGateway?.provider ?? null;
      this.terminalOptions.set(options);
      this.selectedTerminalIds.set([...this.assigned.terminalIds]);
      this.#emitAssignment();
      return;
    }

    this.terminalsLoading.set(true);
    this.#emitAssignment();
    this.#loadTerminalsForConfiguration(configurationId);
  }

  protected terminalSelectionRequiredError(): boolean {
    return this.saveAttempted && this.#isTerminalSelectionRequired() && this.selectedTerminalIds().length === 0;
  }

  protected toggleTerminal(terminalId: string): void {
    const currentSelection: string[] = this.selectedTerminalIds();
    const newSelection: string[] = currentSelection.includes(terminalId)
      ? currentSelection.filter(selectedId => selectedId !== terminalId)
      : [...currentSelection, terminalId];
    this.selectedTerminalIds.set(newSelection);
    this.#emitAssignment();
  }

  protected toggleTerminalsExpanded(): void {
    this.terminalsExpanded.set(!this.terminalsExpanded());
  }

  #assignedTerminalsToOptions(terminals: OnsiteSetupPaymentConfigurationTerminal[]): TerminalOption[] {
    return terminals.map(terminal => ({ id: terminal.id, title: this.#terminalTitle(terminal.label, terminal.external_id) }));
  }

  #detailTerminalsToOptions(terminals: PaymentConfigurationTerminal[]): TerminalOption[] {
    return terminals.map(terminal => ({ id: terminal.id, title: this.#terminalTitle(terminal.label, terminal.externalId) }));
  }

  #emitAssignment(): void {
    this.assignmentChange.emit({
      integratedGatewayProvider: this.#selectedConfigurationProvider,
      paymentConfigurationId: this.selectedConfigurationId(),
      selectedTerminalIds: [...this.selectedTerminalIds()],
    });
    this.#emitValidity();
  }

  #emitValidity(): void {
    this.assignmentValidChange.emit(this.#isAssignmentValid());
  }

  #isAssignmentValid(): boolean {
    if (this.terminalsLoading() || this.terminalsLoadFailed()) {
      return false;
    }

    if (this.selectedConfigurationId() === null) {
      return false;
    }
    return !this.#isTerminalSelectionRequired() || this.selectedTerminalIds().length > 0;
  }

  #isTerminalSelectionRequired(): boolean {
    return this.selectedConfigurationIsIntegrated() && this.terminalOptions().length > 0;
  }

  #loadTerminalsForConfiguration(configurationId: string): void {
    if (this.placeId === null) {
      this.terminalsLoading.set(false);
      this.selectedConfigurationIsIntegrated.set(false);
      this.terminalsLoadFailed.set(true);
      this.#emitValidity();
      return;
    }
    this.terminalsLoading.set(true);
    this.#paymentConfigurationsService
      .getPaymentConfiguration(this.placeId, configurationId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          if (this.selectedConfigurationId() !== configurationId) {
            return;
          }
          this.terminalsLoading.set(false);
          this.selectedConfigurationIsIntegrated.set(false);
          this.terminalOptions.set([]);
          this.terminalsLoadFailed.set(true);
          this.#selectedConfigurationProvider = null;
          this.#emitAssignment();
        },
        next: (detail: PaymentConfigurationDetail) => {
          if (this.selectedConfigurationId() !== configurationId) {
            return;
          }
          this.terminalsLoading.set(false);
          this.terminalsLoadFailed.set(false);
          this.selectedConfigurationIsIntegrated.set(detail.gateways.length > 0);
          this.#selectedConfigurationProvider = detail.gateways[0]?.provider ?? null;
          const options: TerminalOption[] = this.#detailTerminalsToOptions(detail.gateways.flatMap(gateway => gateway.terminals));
          this.terminalOptions.set(options);

          if (this.assigned.terminalIds.length === 0) {
            this.selectedTerminalIds.set(options.map(terminalOption => terminalOption.id));
          }
          this.#emitAssignment();
        },
      });
  }

  #reprojectSelectedConfigurationOption(options: SelectOption[]): void {
    const selectedId: string | null = this.selectedConfigurationId();
    if (selectedId === null) {
      return;
    }
    const matchingOption: SelectOption | undefined = options.find(option => option.id === selectedId);
    this.selectedConfigurationOption.set(matchingOption ?? { id: selectedId, title: this.assigned.configuration?.name ?? '' });
  }

  #resetToAssigned(): void {
    const assignedConfiguration: OnsiteSetupPaymentConfiguration | null = this.assigned.configuration;
    this.configurationOptions.set([...this.configurationOptions()]);
    this.selectedConfigurationId.set(assignedConfiguration?.id ?? null);
    this.selectedConfigurationOption.set(
      assignedConfiguration !== null ? { id: assignedConfiguration.id, title: assignedConfiguration.name } : undefined,
    );
    this.selectedConfigurationIsIntegrated.set(assignedConfiguration?.integrated_gateway != null);
    this.#selectedConfigurationProvider = assignedConfiguration?.integrated_gateway?.provider ?? null;
    const options: TerminalOption[] = this.#assignedTerminalsToOptions(assignedConfiguration?.integrated_gateway?.terminals ?? []);
    this.terminalOptions.set(options);
    this.selectedTerminalIds.set([...this.assigned.terminalIds]);
    this.terminalsExpanded.set(true);
    this.terminalsLoading.set(false);
    this.terminalsLoadFailed.set(false);
    this.#emitValidity();
  }

  #terminalTitle(label: string | null, externalId: string): string {
    return label !== null && label !== '' ? label : externalId;
  }
}
