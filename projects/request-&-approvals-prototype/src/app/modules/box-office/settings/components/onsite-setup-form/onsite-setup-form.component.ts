import { NgForOf, NgIf, NgSwitch, NgSwitchCase, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  input,
  OnChanges,
  Output,
  output,
  Signal,
  signal,
  SimpleChanges,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { PrinterDocumentType } from '@fz-original/app/onsite-appearance/enums/printer-document-type.enum';
import { PrintConfigurationBundle } from '@fz-original/app/onsite-appearance/models/print-configuration-bundle.model';
import { PrintConfigurationBundleService } from '@fz-original/app/onsite-appearance/services/print-configuration-bundle/print-configuration-bundle.service';
import { SelectDropdownDescriptionType } from '@fz-original/app/shared/dropdown/select-dropdown-description-type';
import type { RetailSetup } from '@fz-shop-products/src/public-api';
import { IgntButtonComponent, IgntSwitchComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntRadioGroupComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio-group.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { DropdownService } from '../../../../../shared/dropdown/dropdown.service';
import { SelectDropdownPlanOption } from '../../../../../shared/dropdown/select-dropdown-plan-option';
import {
  MultiSelectCustomOptionAsyncEvent,
  MultiSelectCustomOptionAsyncState,
  MultiSelectCustomOptionI18n,
} from '../../../../../shared/layout/filters/multi-select/multi-select-custom-option.model';
import { MultiSelectModule } from '../../../../../shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '../../../../../shared/layout/filters/select/select.interface';
import { FilterSelectModule } from '../../../../../shared/layout/filters/select/select.module';
import { PlanStatus } from '../../../../../shared/models/plan/plan-status.enum';
import { PlanOption } from '../../../../../shared/search-bar/models/plan-option.model';
import { Channel } from '../../../../../shared/services/session-availability/channel.enum';
import { ListPlanItem } from '../../../../attendees/list-attendees/models/list-plan-item.model';
import { CashRegister } from '../../../shared/models/cash-register';
import {
  CutterTypeEnum,
  HardwareTypeEnum,
  OboFlowTypeEnum,
  OboPrinterTypeEnum,
  OnsiteSetup,
  OnsiteSetupPaymentConfigurationAssignment,
  PaperTypeEnum,
  PriceViewerEnum,
  ReceiptPrinterType,
  SessionAvailabilityCacheStrategyEnum,
  SessionAvailabilityPlanConfigDTO,
  ShiftStrategyEnum,
  TicketSelectorTypeEnum,
  TicketValidationTypeEnum,
} from '../../../shared/models/onsite-setup';
import { PaymentConfigurationGatewayProvider } from '../../../shared/models/payment-configuration';
import { CashRegistersService } from '../../../shared/services/cash-registers/cash-registers.service';
import { NEW_ONSITE_SETUP_CONTACT_INFORMATION_FIELDS_ORDER } from '../../../shared/utils/contact-information-fields-order.util';
import {
  hasContactInformationFields,
  OnsiteContactInformationSetupValue,
  toOnsiteContactInformationSetupValue,
} from '../../../shared/utils/contact-information-setup.util';
import { OnsiteSetupSalesChannelService } from '../../services/onsite-setup-sales-channel.service';
import { resolveDefaultChannelId } from '../../services/onsite-setup-sales-channel.utils';
import { OnsiteContactInformationSetupComponent } from './onsite-contact-information-setup/onsite-contact-information-setup.component';
import {
  AssignedPaymentConfiguration,
  OnsitePaymentConfigurationAssignmentComponent,
} from './onsite-payment-configuration-assignment/onsite-payment-configuration-assignment.component';
import { OnsitePresetCouponCodesFilterComponent } from './onsite-preset-coupon-codes-filter/onsite-preset-coupon-codes-filter.component';
import { OnsitePrioritizedMainPlansFilterComponent } from './onsite-prioritized-plan-list-filter/onsite-prioritized-main-plans-filter.component';
import { BoxOfficeOnsiteSetupForm } from './onsite-setup-form.model';
import { OnsiteSetupSalesChannelSelectorComponent } from './onsite-setup-sales-channel-selector/onsite-setup-sales-channel-selector.component';

/**
 * These form field specifies ids that are not ids but
 * form control values.
 *
 * @todo: refactor.
 *
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FilterSelectModule,
    IgntButtonComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntListItemComponent,
    IgntRadioComponent,
    IgntRadioGroupComponent,
    IgntSwitchComponent,
    MultiSelectModule,
    NgForOf,
    NgIf,
    NgSwitch,
    NgSwitchCase,
    NgTemplateOutlet,
    OnsiteContactInformationSetupComponent,
    OnsitePaymentConfigurationAssignmentComponent,
    OnsitePresetCouponCodesFilterComponent,
    OnsitePrioritizedMainPlansFilterComponent,
    OnsiteSetupSalesChannelSelectorComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-onsite-setup-form',
  styleUrls: [
    '../../../../sessions/shared/components/common-edit-form/common-edit-form.component.scss',
    'onsite-setup-form.component.scss',
  ],
  templateUrl: './onsite-setup-form.component.html',
})
export class OnsiteSetupFormComponent implements OnChanges {
  readonly MAX_CACHE_TIMEOUT_IN_SECONDS = 259200;

  readonly appearanceConfigEnabled = input.required<boolean>();
  readonly canViewBrandingConfig = input.required<boolean>();
  readonly overrideCapacityEnabled = input.required<boolean>();
  protected readonly showBrandingConfiguration = computed(() => this.appearanceConfigEnabled() && this.canViewBrandingConfig());

  @Input() cashRegisters: CashRegister[] = [];
  protected readonly paymentConfigurationSection = viewChild<ElementRef<HTMLElement>>('paymentConfigurationSection');
  readonly cashRegisterCreated = output<{ id: string; name: string; placeId: number }>();
  readonly paymentConfigurationsTabRequested = output<void>();
  @Output() formChanges: EventEmitter<BoxOfficeOnsiteSetupForm | null> = new EventEmitter<BoxOfficeOnsiteSetupForm | null>();
  @Input() onsiteSetup?: OnsiteSetup;
  @Input() placeId: number | null = null;
  @Input() plans: PlanOption[] = [];
  @Input() retailSetups: RetailSetup[] = [];
  @Input() validationProfilesOptions: SelectOption[] = [];
  @Input() accessControlSetupsOptions: SelectOption[] = [];

  formGroup!: UntypedFormGroup; // assigned by #initForm(), which the constructor calls before anything reads it
  newValue: BoxOfficeOnsiteSetupForm | null = null;
  readonly #formLoaded = signal<boolean>(false);
  protected readonly formLoaded: Signal<boolean> = this.#formLoaded.asReadonly();

  filteredRetailSetups: WritableSignal<RetailSetup[]> = signal([]);
  filteredValidationProfilesOptions: SelectOption[] = [];
  planOptions: SelectOption[] = [];
  retailSetupOptions: SelectOption[] = [];
  warehouseOptionsForRetailSetup: SelectOption[] = [];
  productsHolderPlanOptionsForRetailSetup: SelectOption[] = [];
  shiftMaxHoursOpenOptions: SelectOption[] = [
    { id: 10, title: '10' },
    { id: 14, title: '14' },
    { id: 20, title: '20' },
  ];
  shiftStrategyEnum = ShiftStrategyEnum;
  sessionAvailabilityCacheStrategyEnum = SessionAvailabilityCacheStrategyEnum;
  ticketSelectorTypeEnum = TicketSelectorTypeEnum;
  sessionAvailabilityStrategyOptions: SelectOption[] = [];
  readonly sessionAvailabilityPlanSelectionOptions: WritableSignal<SelectOption[]> = signal<SelectOption[]>([]);
  oboPrinterTypeOptions: SelectOption[] = [
    { id: OboPrinterTypeEnum.no_printer, title: 'boxOffice.settings.actions.onsiteSetup.oboPrinterType.noPrinter' },
    {
      id: OboPrinterTypeEnum.zebra_printer_v2,
      title: 'boxOffice.settings.actions.onsiteSetup.oboPrinterType.zebraNew',
    },
    { id: OboPrinterTypeEnum.adyen_printer, title: 'boxOffice.settings.actions.onsiteSetup.oboPrinterType.adyen' },
  ];

  receiptPrinterTypeOptions: SelectOption[] = [
    { id: ReceiptPrinterType.adyen, title: 'boxOffice.settings.actions.onsiteSetup.receiptPrinterType.adyen' },
    { id: ReceiptPrinterType.epson, title: 'boxOffice.settings.actions.onsiteSetup.receiptPrinterType.epson' },
  ];

  hardwareTypeOptions: SelectOption[] = [
    { id: HardwareTypeEnum.desktop, title: 'boxOffice.settings.actions.onsiteSetup.hardwareType.desktop' },
    { id: HardwareTypeEnum.dual_screen, title: 'boxOffice.settings.actions.onsiteSetup.hardwareType.dualScreen' },
  ];

  oboShiftsConfigOptions: SelectOption[] = [
    { id: 'mandatory', title: 'boxOffice.settings.actions.onsiteSetup.shiftsConfiguration.mandatory' },
    { id: 'disabled', title: 'boxOffice.settings.actions.onsiteSetup.shiftsConfiguration.disabled' },
    { id: 'optional', title: 'boxOffice.settings.actions.onsiteSetup.shiftsConfiguration.optional' },
  ];

  cashRegistersUpdated = false;
  plansUpdated = false;
  shiftMaxHoursOpenUpdated = false;
  selectedPlanOptions: SelectOption[] = [];
  selectedShiftMaxHoursOpenOptions: number | null = null;
  selectedCashRegisterOptions: SelectOption[] = [];
  cashRegisterSelectOptions: SelectOption[] = [];
  selectedOboPrinterTypeOptions: SelectOption | null = null;
  selectedReceiptPrinterTypeOptions: SelectOption | null = null;
  selectedHardwareTypeOption: SelectOption | null = null;
  selectedOboShiftsConfigOptions: SelectOption | null = null;
  selectedProductsHolderPlanOption: SelectOption | null = null;
  selectedRetailSetupOption: SelectOption | null = null;
  selectedWarehouseOption: SelectOption | null = null;
  selectedValidationProfilesOptions: SelectOption[] = [];
  selectedAccessControlSetupOption: SelectOption | null = null;
  contactInformationConfigurationFormOpened: WritableSignal<boolean> = signal<boolean>(false);
  presetCouponsFilterShow: WritableSignal<boolean> = signal<boolean>(false);
  prioritizedPlansFilterShow: WritableSignal<boolean> = signal<boolean>(false);
  printerConfigurationFormOpened: WritableSignal<boolean> = signal<boolean>(false);
  paymentConfigurationAssignmentFormOpened: WritableSignal<boolean> = signal<boolean>(false);
  catalogConfigurationFormOpened: WritableSignal<boolean> = signal<boolean>(false);
  shiftsConfigurationFormOpened: WritableSignal<boolean> = signal<boolean>(false);
  ticketSelectionFormOpened: WritableSignal<boolean> = signal<boolean>(false);
  sessionsVisibilityFormOpened: WritableSignal<boolean> = signal<boolean>(false);
  validationFormOpened: WritableSignal<boolean> = signal<boolean>(false);
  advancedFormOpened: WritableSignal<boolean> = signal<boolean>(false);
  sessionAvailabilityFormOpened: WritableSignal<boolean> = signal<boolean>(false);
  sessionAvailabilityPlanOverrideEnabled: WritableSignal<boolean> = signal<boolean>(false);
  sessionAvailabilityPlanConfigs: WritableSignal<SessionAvailabilityPlanConfigDTO[]> = signal<SessionAvailabilityPlanConfigDTO[]>([]);
  readonly #contactInformationSetup: WritableSignal<OnsiteContactInformationSetupValue> = signal<OnsiteContactInformationSetupValue>(
    toOnsiteContactInformationSetupValue(null, NEW_ONSITE_SETUP_CONTACT_INFORMATION_FIELDS_ORDER),
  );
  readonly contactInformationSetup: Signal<OnsiteContactInformationSetupValue> = this.#contactInformationSetup.asReadonly();
  availableSessionAvailabilityPlanOptions: SelectOption[] = [];
  allPlanOptions: SelectOption[] = [];
  shouldShowCatalogConfigurationForm = computed(() => {
    return this.filteredRetailSetups().length > 0;
  });
  shouldShowRetailSetupFields: WritableSignal<boolean> = signal<boolean>(false);
  paymentConfigurationAssignmentValid = true;
  paymentConfigurationSaveAttempted = false;
  assignedPaymentConfiguration: AssignedPaymentConfiguration = { configuration: null, terminalIds: [] };
  #assignedIntegratedGatewayProvider: PaymentConfigurationGatewayProvider | null = null;

  readonly #salesChannelService = inject(OnsiteSetupSalesChannelService);

  readonly cashRegisterCustomOptionAsync = signal<MultiSelectCustomOptionAsyncState>({
    errorMessage: null,
    pending: false,
  });
  readonly cashRegistersAddCustomOptionI18n: MultiSelectCustomOptionI18n = {
    baseKey: 'boxOffice.settings.actions.onsiteSetup.cashRegisters.addCustomOption',
  };
  readonly #cashRegistersService = inject(CashRegistersService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #errorPriority: readonly string[] = ['required', 'min', 'max'];
  readonly #dropdownService = inject(DropdownService);
  readonly #formBuilder = inject(UntypedFormBuilder);
  readonly #sessionAvailabilityPlanTimeoutControls = new Map<number, FormControl<number>>();
  readonly #translateService = inject(TranslateService);
  readonly #printConfigurationBundleService = inject(PrintConfigurationBundleService);
  readonly #brandingConfigs: Signal<PrintConfigurationBundle[]> = toSignal(
    toObservable(this.showBrandingConfiguration).pipe(
      switchMap(showBrandingConfiguration =>
        showBrandingConfiguration ? this.#printConfigurationBundleService.getAll().pipe(catchError(() => of([]))) : of([]),
      ),
    ),
    { initialValue: [] },
  );
  readonly #brandingBundleId = signal<string | null>(null);
  readonly brandingConfigOptions = computed<SelectOption[]>(() => [
    { id: '', title: this.#translateService.instant('boxOffice.settings.actions.onsiteSetup.brandingConfiguration.none') },
    ...this.#brandingConfigs().map(bundle => ({ id: bundle.id, title: bundle.name })),
  ]);
  readonly selectedBrandingConfigOption = computed<SelectOption | null>(
    () => this.brandingConfigOptions().find(option => option.id === (this.#brandingBundleId() ?? '')) ?? null,
  );
  readonly selectedBrandingConfig = computed<PrintConfigurationBundle | null>(
    () => this.#brandingConfigs().find(bundle => bundle.id === this.#brandingBundleId()) ?? null,
  );
  readonly brandingSummaryItems = computed<string[]>(() => {
    const ticket = this.selectedBrandingConfig()?.printConfigurations.find(
      config => config.documentType === PrinterDocumentType.ticket,
    )?.ticket;
    if (!ticket) {
      return [];
    }
    const enabledSections: Record<string, boolean> = {
      partnerLogo: ticket.partnerLogoUrl !== null && ticket.partnerLogoUrl.length > 0,
      venueName: ticket.venueName,
      address: ticket.address,
      dateAndStartTime: ticket.dateAndStartTime,
      openGates: ticket.openGates,
      price: ticket.price,
      surchargeBreakdown: ticket.surchargeBreakdown,
      codeTextBelowQr: ticket.codeTextBelowQr,
      seatingInfo: ticket.seatingInfo,
      nominative: ticket.nominative,
      partnerTaxInfo: ticket.partnerTaxInfo,
      disclaimerAndTerms: ticket.disclaimerAndTerms,
      poweredByFever: ticket.poweredByFever,
    };
    return Object.entries(enabledSections)
      .filter(([, enabled]) => enabled)
      .map(([section]) => `boxOffice.settings.actions.onsiteSetup.brandingConfiguration.sections.${section}`);
  });

  constructor() {
    this.#initForm();
    this.#formLoaded.set(true);

    this.oboPrinterTypeOptions.forEach(option => {
      option.title = this.#translateService.instant(option.title);
    });
    this.receiptPrinterTypeOptions.forEach(option => {
      option.title = this.#translateService.instant(option.title);
    });
    this.hardwareTypeOptions.forEach(option => {
      option.title = this.#translateService.instant(option.title);
    });
    this.oboShiftsConfigOptions.forEach(option => {
      option.title = this.#translateService.instant(option.title);
    });
    this.sessionAvailabilityStrategyOptions = [
      {
        id: SessionAvailabilityCacheStrategyEnum.no_cache,
        title: this.#translateService.instant('boxOffice.settings.actions.onsiteSetup.sessionAvailability.strategy.no_cache.title'),
      },
      {
        id: SessionAvailabilityCacheStrategyEnum.time_to_live,
        title: this.#translateService.instant('boxOffice.settings.actions.onsiteSetup.sessionAvailability.strategy.time_to_live.title'),
      },
      {
        id: SessionAvailabilityCacheStrategyEnum.stale_while_revalidate,
        title: this.#translateService.instant(
          'boxOffice.settings.actions.onsiteSetup.sessionAvailability.strategy.stale_while_revalidate.title',
        ),
      },
    ];

    effect(() => {
      const partnerChannelOptions = this.#salesChannelService.partnerChannelOptions();
      if (partnerChannelOptions.length === 0 || this.onsiteSetup || !this.formGroup) {
        return;
      }

      this.#syncCreateModeChannelId(partnerChannelOptions);
    });
  }

  #syncCreateModeChannelId(partnerChannelOptions: SelectOption[]): void {
    const currentChannelId: string | undefined = this.formGroup.get('channelId')?.value;
    if (currentChannelId == null) {
      return;
    }

    const isCurrentInPartnerList = partnerChannelOptions.some(option => option.id === currentChannelId);
    if (isCurrentInPartnerList) {
      return;
    }

    const defaultChannelId = resolveDefaultChannelId(partnerChannelOptions);
    if (currentChannelId === defaultChannelId) {
      return;
    }

    this.formGroup.get('channelId')?.setValue(defaultChannelId, { emitEvent: false });
    this.#salesChannelService.loadPlansForChannel(defaultChannelId);
  }

  #syncSelectedBrandingConfig(): void {
    this.#brandingBundleId.set(this.formGroup?.get('printConfigurationBundleId')?.value ?? null);
  }

  selectBrandingConfig(option: SelectOption): void {
    const bundleId: string | null = option.id === '' ? null : String(option.id);
    if (bundleId === this.#brandingBundleId()) {
      return;
    }

    this.#brandingBundleId.set(bundleId);
    this.formGroup.get('printConfigurationBundleId')?.setValue(bundleId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.#loadPlanOptions();

    if (changes.retailSetups) {
      this.#loadRetailSetupOptions();
    }

    if (changes.onsiteSetup?.currentValue) {
      this.paymentConfigurationAssignmentValid = this.#getPaymentConfigurationAssignmentValidity();
      this.paymentConfigurationSaveAttempted = false;
      this.#refreshPaymentConfigurationAssignmentInputs();
      this.#loadForm();
    } else if (changes.onsiteSetup) {
      if (!changes.onsiteSetup.currentValue && !changes.onsiteSetup.previousValue) {
        this.reset();
        this.#initForm();
      } else {
        this.reset();
      }
    }

    if (this.formGroup && this.#areChannelPlansReady() && (changes['plans'] || this.plans.length > 0)) {
      this.#removeUnavailablePlanSelections(new Set(this.plans.map(plan => plan.id)));
    }

    const planIds: number[] = this.formGroup.get('printTicketsCombinedForPlans')?.value ?? [];
    this.selectedPlanOptions = this.planOptions.filter((selectedPlan: SelectOption) => planIds.includes(selectedPlan.id));
    this.selectedShiftMaxHoursOpenOptions = this.formGroup.get('shiftMaxHoursOpen')?.value ?? 0;

    const printerType: OboPrinterTypeEnum | undefined = this.formGroup.get('oboPrinterType')?.value;
    if (printerType) {
      this.selectedOboPrinterTypeOptions = this.oboPrinterTypeOptions.find(option => option.id === printerType) ?? null;
    }

    const receiptPrinterType: ReceiptPrinterType | undefined = this.formGroup.get('receiptPrinterType')?.value;
    if (receiptPrinterType) {
      this.selectedReceiptPrinterTypeOptions = this.receiptPrinterTypeOptions.find(option => option.id === receiptPrinterType) ?? null;
    }

    const hardwareType: HardwareTypeEnum | undefined = this.formGroup.get('hardwareType')?.value;
    this.selectedHardwareTypeOption = this.hardwareTypeOptions.find(option => option.id === hardwareType) ?? null;

    this.#syncSelectedBrandingConfig();

    const shiftStrategy: ShiftStrategyEnum | undefined = this.formGroup.get('shiftsMandatory')?.value;
    if (shiftStrategy) {
      this.selectedOboShiftsConfigOptions = this.oboShiftsConfigOptions.find(option => option.id === shiftStrategy) ?? null;
    }

    const retailSetupId: string | null | undefined = this.formGroup.get('retailSetupId')?.value;
    if (retailSetupId) {
      this.selectedRetailSetupOption = this.retailSetupOptions.find(option => retailSetupId === option.id) ?? null;
      if (this.selectedRetailSetupOption !== null) {
        this.#loadWarehousesForSelectedRetailSetup(this.selectedRetailSetupOption.id);
        this.#loadPlansForSelectedRetailSetup(this.selectedRetailSetupOption.id);
        this.shouldShowRetailSetupFields.set(true);
      }
    }

    this.#loadCashRegisterOptions({
      mergeCurrentSelection: Boolean(changes['cashRegisters']) && !changes['onsiteSetup'],
    });
    this.#loadSelectedAccessControlSetup();
  }

  onSalesChannelSelected(channelId: string): void {
    const currentChannelId: string | undefined = this.formGroup.get('channelId')?.value;
    if (currentChannelId === channelId) {
      return;
    }

    this.formGroup.get('channelId')?.setValue(channelId);
    this.#salesChannelService.loadPlansForChannel(channelId);
  }

  #loadCashRegisterOptions(options?: { mergeCurrentSelection?: boolean }): void {
    this.cashRegisterSelectOptions = this.cashRegisters.map(cashRegister => ({
      id: cashRegister.id,
      title: cashRegister.name,
    }));

    const selectedCashRegisterIds = this.onsiteSetup?.cash_registers ?? [];
    const mergeCurrentSelection = options?.mergeCurrentSelection === true;
    const idSet = new Set<string>(selectedCashRegisterIds.map(String));
    if (mergeCurrentSelection) {
      this.selectedCashRegisterOptions.forEach(option => idSet.add(String(option.id)));
    }

    if (idSet.size > 0) {
      this.selectedCashRegisterOptions = this.cashRegisterSelectOptions.filter(option => idSet.has(String(option.id)));
      this.selectedCashRegisterOptions.sort((a, b) => (a.title < b.title ? -1 : 1));
    } else {
      this.selectedCashRegisterOptions = [];
    }
  }

  #loadPlanOptions(): void {
    this.planOptions = this.#dropdownService.getPlanDropdownOptions(
      this.plans as ListPlanItem[],
      undefined,
      PlanStatus.ON_SALE,
      SelectDropdownDescriptionType.PLAN_ID,
      this.formGroup?.get('prioritizedMainPlans')?.value ?? this.onsiteSetup?.prioritized_main_plans ?? [],
    );
    this.allPlanOptions = this.#dropdownService.getPlanDropdownOptions(
      this.plans as ListPlanItem[],
      undefined,
      undefined,
      SelectDropdownDescriptionType.PLAN_ID,
    );
    this.#rebuildAvailableSessionAvailabilityPlanOptions();
  }

  #areChannelPlansReady(): boolean {
    const channelId: string | undefined = this.formGroup?.get('channelId')?.value;
    return channelId != null && !this.#salesChannelService.isLoadingPlans() && this.#salesChannelService.loadedChannelId() === channelId;
  }

  #removeUnavailablePlanSelections(availablePlanIds: Set<number>): void {
    if (!this.formGroup) {
      return;
    }

    const currentPrioritizedMainPlans: number[] = this.formGroup.get('prioritizedMainPlans')?.value ?? [];
    const prioritizedMainPlans = currentPrioritizedMainPlans.filter(planId => availablePlanIds.has(planId));
    if (prioritizedMainPlans.length !== currentPrioritizedMainPlans.length) {
      this.formGroup.get('prioritizedMainPlans')?.setValue(prioritizedMainPlans);
      this.plansUpdated = true;
    }

    const currentPrintTicketsCombinedForPlans: number[] = this.formGroup.get('printTicketsCombinedForPlans')?.value ?? [];
    const printTicketsCombinedForPlans = currentPrintTicketsCombinedForPlans.filter(planId => availablePlanIds.has(planId));
    if (printTicketsCombinedForPlans.length !== currentPrintTicketsCombinedForPlans.length) {
      this.formGroup.get('printTicketsCombinedForPlans')?.setValue(printTicketsCombinedForPlans);
      this.plansUpdated = true;
    }
    this.selectedPlanOptions = this.planOptions.filter(option => printTicketsCombinedForPlans.includes(option.id));

    const sessionAvailabilityPlanConfigs = this.sessionAvailabilityPlanConfigs().filter(config => availablePlanIds.has(config.plan_id));
    for (const planId of [...this.#sessionAvailabilityPlanTimeoutControls.keys()]) {
      if (!availablePlanIds.has(planId)) {
        this.#sessionAvailabilityPlanTimeoutControls.delete(planId);
      }
    }
    if (sessionAvailabilityPlanConfigs.length !== this.sessionAvailabilityPlanConfigs().length) {
      this.sessionAvailabilityPlanConfigs.set(sessionAvailabilityPlanConfigs);
      this.formGroup.get('sessionAvailabilityPlanConfigs')?.setValue(sessionAvailabilityPlanConfigs);
      this.plansUpdated = true;
    }
    this.#rebuildAvailableSessionAvailabilityPlanOptions();

    const productsHolderPlanId: number | null = this.formGroup.get('productsHolderPlanId')?.value ?? null;
    if (productsHolderPlanId != null && !availablePlanIds.has(productsHolderPlanId)) {
      this.formGroup.get('productsHolderPlanId')?.setValue(null);
      this.selectedProductsHolderPlanOption = null;
      this.productsHolderPlanOptionsForRetailSetup = [];
      this.plansUpdated = true;
    } else if (productsHolderPlanId != null) {
      const retailSetupId: string | null = this.formGroup.get('retailSetupId')?.value ?? null;
      if (retailSetupId) {
        this.#loadPlansForSelectedRetailSetup(retailSetupId);
      }
    }
  }

  selectPlans(options: SelectDropdownPlanOption[]): void {
    this.plansUpdated = true;
    this.selectedPlanOptions = options;
    const plans = this.selectedPlanOptions.map(selectedPlan => selectedPlan.id);
    this.formGroup.get('printTicketsCombinedForPlans')?.setValue(plans);
  }

  selectShiftMaxHours(option: SelectOption): void {
    this.shiftMaxHoursOpenUpdated = true;
    this.selectedShiftMaxHoursOpenOptions = option.id;
    this.formGroup.get('shiftMaxHoursOpen')?.setValue(option.id);
  }

  getSelectedShiftMaxHoursOpenOptions(): SelectOption | null {
    if (this.selectedShiftMaxHoursOpenOptions == null || this.selectedShiftMaxHoursOpenOptions === 0) {
      return null;
    }
    return {
      id: this.selectedShiftMaxHoursOpenOptions,
      title: this.selectedShiftMaxHoursOpenOptions.toString(),
    };
  }

  selectOboPrinterType(option: SelectOption): void {
    if (this.selectedOboPrinterTypeOptions != option) {
      this.selectedOboPrinterTypeOptions = option;
      this.formGroup.get('oboPrinterType')?.setValue(option.id);
    }
  }

  selectReceiptPrinterType(option: SelectOption): void {
    if (this.selectedReceiptPrinterTypeOptions != option) {
      this.selectedReceiptPrinterTypeOptions = option;
      this.formGroup.get('receiptPrinterType')?.setValue(option.id);
    }
  }

  selectHardwareType(option: SelectOption): void {
    if (this.selectedHardwareTypeOption !== option) {
      this.selectedHardwareTypeOption = option;
      this.formGroup.get('hardwareType')?.setValue(option.id);
    }
  }

  selectOboShiftsConfig(option: SelectOption): void {
    if (this.selectedOboShiftsConfigOptions !== option) {
      this.selectedOboShiftsConfigOptions = option;
      this.formGroup.get('shiftsMandatory')?.setValue(option.id);
    }
  }

  selectProductsHolderPlan(option: SelectOption): void {
    if (this.selectedProductsHolderPlanOption !== option) {
      this.selectedProductsHolderPlanOption = option;
      this.formGroup.get('productsHolderPlanId')?.setValue(option.id);
    }
  }

  selectRetailSetup(option: SelectOption): void {
    if (this.selectedRetailSetupOption !== option) {
      this.selectedRetailSetupOption = option;

      this.formGroup.get('retailSetupId')?.setValue(option?.id || null);

      this.warehouseOptionsForRetailSetup = [];
      this.selectedWarehouseOption = null;
      this.formGroup.get('warehouseId')?.setValue(null);

      this.productsHolderPlanOptionsForRetailSetup = [];
      this.selectedProductsHolderPlanOption = null;
      this.formGroup.get('productsHolderPlanId')?.setValue(null);

      if (option && option.id) {
        this.#loadWarehousesForSelectedRetailSetup(option.id);
        this.#loadPlansForSelectedRetailSetup(option.id);
        this.shouldShowRetailSetupFields.set(true);
      } else {
        this.shouldShowRetailSetupFields.set(false);
      }
    }
  }

  selectWarehouse(option: SelectOption): void {
    if (this.selectedWarehouseOption !== option) {
      this.selectedWarehouseOption = option;
      this.formGroup.get('warehouseId')?.setValue(option.id);
    }
  }

  selectCashRegisters(options: SelectOption[]): void {
    this.cashRegistersUpdated = true;
    this.selectedCashRegisterOptions = [...options];
    this.selectedCashRegisterOptions.sort((a, b) => (a.title < b.title ? -1 : 1));
  }

  selectPrioritizedMainPlans(optionsSelected: SelectOption[]): void {
    this.formGroup.get('prioritizedMainPlans')?.setValue(optionsSelected.map(({ id }) => id));
  }

  selectPresetCouponCodes(optionsSelected: string[]): void {
    this.formGroup.get('presetCouponCodes')?.setValue(optionsSelected);
  }

  //endregion select methods

  #initForm(): void {
    this.formGroup = this.#formBuilder.group({
      name: [this.onsiteSetup?.name, [Validators.required]],
      channelId: [Channel.BoxOffice],
      onlyTicketsForToday: [this.#getShowOnlyToday()],
      shiftsMandatory: [this.#getShiftStrategy()],
      hasNewPaper: [this.#getHasNewPaper()],
      hasCutter: [this.#getHasCutter()],
      hasPriceViewer: [this.#getHasPriceViewer()],
      showSoldOutSessions: [this.#getShowSoldOutSessions()],
      canOverrideCapacities: [this.#getCanOverrideCapacities()],
      isHidden: [this.#getIsHidden()],
      autovalidateTickets: [this.#getAutovalidateTickets()],
      enablePrintTicketsCombinedForPlans: this.#getPrintTicketsCombinedForPlansEnabled(),
      printTicketsCombinedForPlans: [this.#getPrintTicketsCombinedForPlans()],
      enableShiftMaxHoursOpen: [this.#getShiftMaxHoursOpenEnabled()],
      shiftMaxHoursOpen: [this.#getShiftMaxHoursOpen()],
      oboPrinterType: [this.#getPrinterType(), [this.#printerTypeValidator]],
      receiptPrinterType: [this.#getReceiptPrinterType()],
      hardwareType: [this.#getHardwareType()],
      printConfigurationBundleId: [this.#getPrintConfigurationBundleId()],
      paymentConfigurationId: [this.#getPaymentConfigurationId()],
      selectedTerminalIds: [this.#getSelectedTerminalIds()],
      prioritizedMainPlans: [this.#getPrioritizedPlanList()],
      presetCouponCodes: [this.#getPresetCouponCodes()],
      retailSetupId: [this.#getRetailSetupId()],
      warehouseId: [this.#getWarehouseId()],
      productsHolderPlanId: [this.#getProductsHolderPlanId()],
      validationProfilesEnabled: this.#getValidationProfilesEnabled(),
      validationProfiles: [this.#getValidationProfiles()],
      accessControlSetupId: [this.#getAccessControlSetupId()],
      contactInformationFields: [this.#getContactInformationSetup().fields],
      contactInformationFieldsOrder: [this.#getContactInformationSetup().fieldsOrder],
      contactInformationRequirement: [this.#getContactInformationSetup().requirement],
      sessionAvailabilityCacheStrategy: [this.#getSessionAvailabilityCacheStrategy()],
      sessionAvailabilityCacheTimeoutInSeconds: [
        this.#getSessionAvailabilityCacheTimeoutInSeconds(),
        [Validators.min(0), Validators.max(this.MAX_CACHE_TIMEOUT_IN_SECONDS)],
      ],
      sessionAvailabilityPlanOverrideEnabled: [this.#getSessionAvailabilityPlanOverrideEnabled()],
      sessionAvailabilityPlanConfigs: [this.#getSessionAvailabilityPlanConfigs()],
      ticketSelectorType: [this.#getTicketSelectorType()],
    });
    this.#onValueChanges();
    this.printerConfigurationFormOpened.set(!this.onsiteSetup);
    this.paymentConfigurationAssignmentFormOpened.set(!this.onsiteSetup);
    this.catalogConfigurationFormOpened.set(!this.onsiteSetup);
    this.contactInformationConfigurationFormOpened.set(!this.onsiteSetup);
    this.ticketSelectionFormOpened.set(!this.onsiteSetup);
    this.sessionsVisibilityFormOpened.set(!this.onsiteSetup);
    this.validationFormOpened.set(!this.onsiteSetup);
    this.advancedFormOpened.set(false);
    this.sessionAvailabilityFormOpened.set(!this.onsiteSetup);
    this.sessionAvailabilityPlanOverrideEnabled.set(this.#getSessionAvailabilityPlanOverrideEnabled());
    this.sessionAvailabilityPlanConfigs.set(this.#getSessionAvailabilityPlanConfigs());
    this.#contactInformationSetup.set(this.#getContactInformationSetup());
    this.#rebuildAvailableSessionAvailabilityPlanOptions();
    this.#syncSessionAvailabilityCacheTimeoutControl(this.#parseSessionAvailabilityCacheStrategy());
  }

  #printerTypeValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!this.formGroup) {
      return null;
    }

    const printerType: OboPrinterTypeEnum = control.value;

    if (printerType !== OboPrinterTypeEnum.adyen_printer) {
      return null;
    }

    return this.#assignedIntegratedGatewayProvider === 'adyen' || this.#assignedIntegratedGatewayProvider === 'adyen_local'
      ? null
      : { invalidPrinterGatewayCombo: true };
  };

  #getShowOnlyToday(): boolean {
    return this.onsiteSetup?.max_purchasable_days === 1;
  }

  #getShiftStrategy(): ShiftStrategyEnum {
    return this.onsiteSetup?.shift_strategy || ShiftStrategyEnum.disabled;
  }

  #getPaymentConfigurationId(): string | null {
    return this.onsiteSetup?.payment_configuration?.id ?? null;
  }

  #getSelectedTerminalIds(): string[] {
    return this.onsiteSetup?.selected_terminal_ids ?? [];
  }

  onPaymentConfigurationAssignmentChange(assignment: OnsiteSetupPaymentConfigurationAssignment): void {
    this.formGroup.get('paymentConfigurationId')?.setValue(assignment.paymentConfigurationId);
    this.formGroup.get('selectedTerminalIds')?.setValue(assignment.selectedTerminalIds);
    this.#assignedIntegratedGatewayProvider = assignment.integratedGatewayProvider ?? null;
    this.formGroup.get('oboPrinterType')?.updateValueAndValidity();
    this.paymentConfigurationSaveAttempted = false;
  }

  onPaymentConfigurationAssignmentValidChange(valid: boolean): void {
    this.paymentConfigurationAssignmentValid = valid;
  }

  #getPaymentConfigurationAssignmentValidity(): boolean {
    const configuration = this.onsiteSetup?.payment_configuration ?? null;
    // When the section is shown (flag on) a payment configuration is mandatory.
    if (configuration === null) {
      return false;
    }
    const requiresTerminalSelection = (configuration.integrated_gateway?.terminals.length ?? 0) > 0;
    return !requiresTerminalSelection || (this.onsiteSetup?.selected_terminal_ids?.length ?? 0) > 0;
  }

  #refreshPaymentConfigurationAssignmentInputs(): void {
    this.assignedPaymentConfiguration = {
      configuration: this.onsiteSetup?.payment_configuration ?? null,
      terminalIds: this.onsiteSetup?.selected_terminal_ids ?? [],
    };
    this.#assignedIntegratedGatewayProvider = this.onsiteSetup?.payment_configuration?.integrated_gateway?.provider ?? null;
  }

  #parsePaymentConfigurationAssignment(): OnsiteSetupPaymentConfigurationAssignment {
    return {
      paymentConfigurationId: this.formGroup.get('paymentConfigurationId')?.value ?? null,
      selectedTerminalIds: this.formGroup.get('selectedTerminalIds')?.value ?? [],
    };
  }

  #getHasNewPaper(): boolean {
    return this.onsiteSetup?.paper_type === PaperTypeEnum.pre_printed_paper;
  }

  #getHasCutter(): boolean {
    return this.onsiteSetup?.cutter_type === CutterTypeEnum.basic_cutter;
  }

  #getHasPriceViewer(): boolean {
    return this.onsiteSetup?.price_viewer === PriceViewerEnum.bixolodon_bdc_2000;
  }

  #getShowSoldOutSessions(): boolean {
    if (!this.onsiteSetup) {
      return false;
    }
    return Boolean(this.onsiteSetup?.show_sold_out_sessions);
  }

  #getCanOverrideCapacities(): boolean {
    return this.onsiteSetup?.can_override_capacities ?? false;
  }

  #getIsHidden(): boolean {
    return this.onsiteSetup?.is_hidden ?? false;
  }

  #getAutovalidateTickets(): boolean {
    return this.onsiteSetup?.ticket_validation === TicketValidationTypeEnum.autovalidation;
  }

  #getPrintTicketsCombinedForPlansEnabled(): boolean {
    return (this.onsiteSetup?.print_tickets_combined_for_plans?.length ?? 0) > 0;
  }

  #parseEnablePrintTicketsCombinedForPlans(): boolean {
    return this.newValue?.enablePrintTicketsCombinedForPlans ?? (this.onsiteSetup?.print_tickets_combined_for_plans?.length ?? 0) > 0;
  }

  #getPrintTicketsCombinedForPlans(): number[] {
    return this.onsiteSetup?.print_tickets_combined_for_plans ?? [];
  }

  #parsePrintTicketsCombinedForPlans(): number[] {
    const plans: number[] = [];
    this.selectedPlanOptions.forEach(selectedPlan => plans.push(selectedPlan.id));
    this.formGroup.get('printTicketsCombinedForPlans')?.setValue(plans);
    return this.formGroup.get('printTicketsCombinedForPlans')?.value ?? [];
  }

  #getShiftMaxHoursOpenEnabled(): boolean {
    return !(this.onsiteSetup?.shift_max_hours_open === 0);
  }

  #getShiftMaxHoursOpen(): number {
    return this.onsiteSetup?.shift_max_hours_open ?? 0;
  }

  #parseEnableShiftMaxHoursOpen(): boolean {
    return this.newValue?.enableShiftMaxHoursOpen ?? !(this.onsiteSetup?.shift_max_hours_open === 0);
  }

  #parseShiftMaxHoursOpen(): number {
    this.formGroup.get('shiftMaxHoursOpen')?.setValue(this.selectedShiftMaxHoursOpenOptions);
    return this.formGroup.get('shiftMaxHoursOpen')?.value ?? 0;
  }

  #getPrinterType(): OboPrinterTypeEnum {
    if (this.onsiteSetup?.obo_printer_type === OboPrinterTypeEnum.zebra_printer) {
      return OboPrinterTypeEnum.no_printer;
    }
    return this.onsiteSetup?.obo_printer_type || OboPrinterTypeEnum.no_printer;
  }

  #getReceiptPrinterType(): ReceiptPrinterType {
    return this.onsiteSetup?.receipt_printer_type ?? ReceiptPrinterType.adyen;
  }

  #getHardwareType(): HardwareTypeEnum {
    return this.onsiteSetup?.hardware_type ?? HardwareTypeEnum.unknown;
  }

  #getPrintConfigurationBundleId(): string | null {
    return this.onsiteSetup?.print_configuration_bundle_id ?? null;
  }

  #parseShowOnlyToday(): number {
    if (this.newValue == null) {
      return this.onsiteSetup?.max_purchasable_days ?? 0;
    }
    return this.newValue.onlyTicketsForToday ? 1 : 8;
  }

  #parsePrinterType(): OboPrinterTypeEnum {
    if (this.newValue == null) {
      return this.onsiteSetup?.obo_printer_type ?? OboPrinterTypeEnum.no_printer;
    }

    return this.newValue.oboPrinterType ?? OboPrinterTypeEnum.no_printer;
  }

  #parseReceiptPrinterType(): ReceiptPrinterType {
    if (this.newValue == null) {
      return this.onsiteSetup?.receipt_printer_type ?? ReceiptPrinterType.adyen;
    }

    return this.newValue.receiptPrinterType ?? ReceiptPrinterType.adyen;
  }

  #parseHardwareType(): HardwareTypeEnum | undefined {
    const hardwareType: HardwareTypeEnum =
      this.newValue == null
        ? (this.onsiteSetup?.hardware_type ?? HardwareTypeEnum.unknown)
        : (this.newValue.hardwareType ?? HardwareTypeEnum.unknown);

    return hardwareType === HardwareTypeEnum.unknown ? undefined : hardwareType;
  }

  #parsePrintConfigurationBundleId(): string | null {
    if (this.newValue == null) {
      return this.onsiteSetup?.print_configuration_bundle_id ?? null;
    }

    return this.newValue.printConfigurationBundleId ?? null;
  }

  #parseShiftStrategy(): ShiftStrategyEnum {
    if (this.newValue == null) {
      return this.onsiteSetup?.shift_strategy ?? ShiftStrategyEnum.disabled;
    }
    return this.newValue?.shiftsMandatory ?? ShiftStrategyEnum.disabled;
  }

  #parsePaperType(): PaperTypeEnum {
    if (this.newValue == null) {
      return this.onsiteSetup?.paper_type ?? PaperTypeEnum.basic_paper;
    }
    return this.newValue.hasNewPaper ? PaperTypeEnum.pre_printed_paper : PaperTypeEnum.basic_paper;
  }

  #parseCutterType(): CutterTypeEnum {
    if (this.newValue == null) {
      return this.onsiteSetup?.cutter_type ?? CutterTypeEnum.none;
    }
    return this.newValue.hasCutter ? CutterTypeEnum.basic_cutter : CutterTypeEnum.none;
  }

  #parsePriceViewer(): PriceViewerEnum {
    if (this.newValue == null) {
      return this.onsiteSetup?.price_viewer ?? PriceViewerEnum.none;
    }
    return this.newValue.hasPriceViewer ? PriceViewerEnum.bixolodon_bdc_2000 : PriceViewerEnum.none;
  }

  #parseShowSoldOutSessions(): boolean {
    if (this.newValue == null) {
      return this.onsiteSetup?.show_sold_out_sessions ?? false;
    }
    if (this.newValue.showSoldOutSessions == null) {
      return false;
    }
    return this.newValue.showSoldOutSessions;
  }

  #parseCanOverrideCapacities(): boolean {
    if (this.newValue == null) {
      return this.onsiteSetup?.can_override_capacities ?? false;
    }
    if (this.newValue.canOverrideCapacities == null) {
      return false;
    }
    return this.newValue.canOverrideCapacities;
  }

  #parseIsHidden(): boolean {
    if (this.newValue == null) {
      return this.onsiteSetup?.is_hidden ?? false;
    }
    if (this.newValue.isHidden == null) {
      return false;
    }
    return this.newValue.isHidden;
  }

  #parseAutovalidateTickets(): TicketValidationTypeEnum {
    if (this.newValue == null) {
      return this.onsiteSetup?.ticket_validation ?? TicketValidationTypeEnum.manual_validation;
    }
    return this.newValue?.autovalidateTickets ? TicketValidationTypeEnum.autovalidation : TicketValidationTypeEnum.manual_validation;
  }

  #getSessionAvailabilityCacheStrategy(): SessionAvailabilityCacheStrategyEnum {
    if (!this.onsiteSetup) {
      return SessionAvailabilityCacheStrategyEnum.stale_while_revalidate;
    }
    return this.onsiteSetup.session_availability_cache_strategy ?? SessionAvailabilityCacheStrategyEnum.no_cache;
  }

  #getSessionAvailabilityCacheTimeoutInSeconds(): number {
    return this.onsiteSetup?.session_availability_cache_timeout_in_seconds ?? 0;
  }

  #getSessionAvailabilityPlanOverrideEnabled(): boolean {
    return (this.onsiteSetup?.session_availability_plan_configs?.length ?? 0) > 0;
  }

  #getSessionAvailabilityPlanConfigs(): SessionAvailabilityPlanConfigDTO[] {
    return this.onsiteSetup?.session_availability_plan_configs ?? [];
  }

  #parseSessionAvailabilityCacheStrategy(): SessionAvailabilityCacheStrategyEnum {
    return this.formGroup.get('sessionAvailabilityCacheStrategy')?.value ?? SessionAvailabilityCacheStrategyEnum.no_cache;
  }

  #parseSessionAvailabilityCacheTimeoutInSeconds(): number {
    const strategy = this.#parseSessionAvailabilityCacheStrategy();
    if (strategy !== SessionAvailabilityCacheStrategyEnum.time_to_live) {
      return 0;
    }
    return Number(this.formGroup.get('sessionAvailabilityCacheTimeoutInSeconds')?.value) || 0;
  }

  #parseSessionAvailabilityPlanConfigs(): SessionAvailabilityPlanConfigDTO[] {
    if (!this.sessionAvailabilityPlanOverrideEnabled()) {
      return [];
    }
    return this.sessionAvailabilityPlanConfigs().map(config => {
      if (config.strategy !== SessionAvailabilityCacheStrategyEnum.time_to_live) {
        return { plan_id: config.plan_id, strategy: config.strategy };
      }

      const timeoutControl = this.#sessionAvailabilityPlanTimeoutControls.get(config.plan_id);
      if (!timeoutControl?.valid) {
        return config;
      }

      return {
        ...config,
        timeout_in_seconds: Number(timeoutControl.value) || 0,
      };
    });
  }

  #getTicketSelectorType(): TicketSelectorTypeEnum {
    return this.onsiteSetup?.ticket_selector_type ?? TicketSelectorTypeEnum.standard;
  }

  #parseTicketSelectorType(): TicketSelectorTypeEnum {
    return this.formGroup.get('ticketSelectorType')?.value ?? TicketSelectorTypeEnum.standard;
  }

  selectTicketSelectorType(ticketSelectorType: TicketSelectorTypeEnum): void {
    this.formGroup.get('ticketSelectorType')?.setValue(ticketSelectorType);
  }

  selectSessionAvailabilityCacheStrategy(strategy: SessionAvailabilityCacheStrategyEnum): void {
    this.formGroup.get('sessionAvailabilityCacheStrategy')?.setValue(strategy);
    this.#syncSessionAvailabilityCacheTimeoutControl(strategy);
  }

  toggleSessionAvailabilityPlanOverride(): void {
    const enabled = !this.sessionAvailabilityPlanOverrideEnabled();
    this.sessionAvailabilityPlanOverrideEnabled.set(enabled);
    this.formGroup.get('sessionAvailabilityPlanOverrideEnabled')?.setValue(enabled);
    if (!enabled) {
      this.#sessionAvailabilityPlanTimeoutControls.clear();
      this.sessionAvailabilityPlanSelectionOptions.set([]);
      this.sessionAvailabilityPlanConfigs.set([]);
      this.formGroup.get('sessionAvailabilityPlanConfigs')?.setValue([]);
      this.#rebuildAvailableSessionAvailabilityPlanOptions();
    }
  }

  onSessionAvailabilityPlanSelectionChanged(selectedPlans: SelectOption[]): void {
    if (selectedPlans.length === 0) {
      return;
    }
    const selectedPlan = selectedPlans.at(-1);
    const selectedPlanId = Number(selectedPlan?.id);
    if (Number.isNaN(selectedPlanId)) {
      return;
    }
    this.addSessionAvailabilityPlanConfig(selectedPlanId);
    if (this.sessionAvailabilityPlanSelectionOptions().length > 0) {
      this.sessionAvailabilityPlanSelectionOptions.set([]);
    }
  }

  addSessionAvailabilityPlanConfig(planId: number): void {
    const configs = [...this.sessionAvailabilityPlanConfigs()];
    if (configs.some(c => c.plan_id === planId)) {
      return;
    }
    configs.push({
      plan_id: planId,
      strategy: SessionAvailabilityCacheStrategyEnum.no_cache,
    });
    this.sessionAvailabilityPlanConfigs.set(configs);
    this.formGroup.get('sessionAvailabilityPlanConfigs')?.setValue(configs);
    this.#rebuildAvailableSessionAvailabilityPlanOptions();
  }

  removeSessionAvailabilityPlanConfig(planId: number): void {
    this.#sessionAvailabilityPlanTimeoutControls.delete(planId);
    const configs = this.sessionAvailabilityPlanConfigs().filter(c => c.plan_id !== planId);
    this.sessionAvailabilityPlanConfigs.set(configs);
    this.formGroup.get('sessionAvailabilityPlanConfigs')?.setValue(configs);
    this.#rebuildAvailableSessionAvailabilityPlanOptions();
  }

  updateSessionAvailabilityPlanConfigStrategy(planId: number, strategy: SessionAvailabilityCacheStrategyEnum): void {
    const existing = this.sessionAvailabilityPlanConfigs().find(c => c.plan_id === planId);
    if (existing?.strategy === strategy) {
      return;
    }
    const configs = this.sessionAvailabilityPlanConfigs().map(c =>
      c.plan_id === planId
        ? {
            ...c,
            strategy,
            timeout_in_seconds: strategy === SessionAvailabilityCacheStrategyEnum.time_to_live ? (c.timeout_in_seconds ?? 0) : undefined,
          }
        : c,
    );
    this.sessionAvailabilityPlanConfigs.set(configs);
    this.formGroup.get('sessionAvailabilityPlanConfigs')?.setValue(configs);
    this.#syncSessionAvailabilityPlanTimeoutControl(planId, strategy, configs.find(c => c.plan_id === planId)?.timeout_in_seconds);
  }

  updateSessionAvailabilityPlanConfigTimeout(planId: number, timeout: number): void {
    const configs = this.sessionAvailabilityPlanConfigs().map(c => (c.plan_id === planId ? { ...c, timeout_in_seconds: timeout } : c));
    this.sessionAvailabilityPlanConfigs.set(configs);
    this.formGroup.get('sessionAvailabilityPlanConfigs')?.setValue(configs);
  }

  getSessionAvailabilityPlanTimeoutControl(planId: number, timeout: number): FormControl<number> {
    const existingControl = this.#sessionAvailabilityPlanTimeoutControls.get(planId);
    if (existingControl) {
      if (existingControl.pristine && existingControl.value !== timeout) {
        existingControl.setValue(timeout, { emitEvent: false });
      }
      return existingControl;
    }

    const control = new FormControl(timeout, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(259200)],
    });
    this.#sessionAvailabilityPlanTimeoutControls.set(planId, control);
    return control;
  }

  onSessionAvailabilityPlanTimeoutBlurred(planId: number): void {
    const control = this.#sessionAvailabilityPlanTimeoutControls.get(planId);
    if (!control || !control.valid) {
      return;
    }

    this.updateSessionAvailabilityPlanConfigTimeout(planId, Number(control.value) || 0);
  }

  getPlanNameById(planId: number): string {
    const plan = this.allPlanOptions.find(p => p.id === planId);
    return plan?.title ?? `Plan ${planId}`;
  }

  getAvailablePlansForSessionAvailability(): SelectOption[] {
    const configuredPlanIds = new Set(this.sessionAvailabilityPlanConfigs().map(c => c.plan_id));
    return this.allPlanOptions.filter(p => !configuredPlanIds.has(p.id));
  }

  #rebuildAvailableSessionAvailabilityPlanOptions(): void {
    this.availableSessionAvailabilityPlanOptions = this.getAvailablePlansForSessionAvailability();
  }

  getSessionAvailabilityStrategyPreloadedOption(strategy: SessionAvailabilityCacheStrategyEnum): SelectOption {
    return (
      this.sessionAvailabilityStrategyOptions.find(option => option.id === strategy) ??
      this.sessionAvailabilityStrategyOptions[0] ?? { id: strategy, title: strategy }
    );
  }

  #updateForm(): void {
    this.formGroup.setValue(
      {
        name: this.onsiteSetup?.name,
        channelId: this.onsiteSetup!.channel_id ?? Channel.BoxOffice,
        onlyTicketsForToday: this.#getShowOnlyToday(),
        shiftsMandatory: this.#getShiftStrategy(),
        hasNewPaper: this.#getHasNewPaper(),
        hasCutter: this.#getHasCutter(),
        hasPriceViewer: this.#getHasPriceViewer(),
        showSoldOutSessions: this.#getShowSoldOutSessions(),
        canOverrideCapacities: this.#getCanOverrideCapacities(),
        isHidden: this.#getIsHidden(),
        autovalidateTickets: this.#getAutovalidateTickets(),
        enablePrintTicketsCombinedForPlans: this.#getPrintTicketsCombinedForPlansEnabled(),
        printTicketsCombinedForPlans: this.#getPrintTicketsCombinedForPlans(),
        enableShiftMaxHoursOpen: this.#getShiftMaxHoursOpenEnabled(),
        shiftMaxHoursOpen: this.#getShiftMaxHoursOpen(),
        oboPrinterType: this.#getPrinterType(),
        receiptPrinterType: this.#getReceiptPrinterType(),
        hardwareType: this.#getHardwareType(),
        printConfigurationBundleId: this.#getPrintConfigurationBundleId(),
        paymentConfigurationId: this.#getPaymentConfigurationId(),
        selectedTerminalIds: this.#getSelectedTerminalIds(),
        prioritizedMainPlans: this.#getPrioritizedPlanList(),
        presetCouponCodes: this.#getPresetCouponCodes(),
        retailSetupId: this.#getRetailSetupId(),
        warehouseId: this.#getWarehouseId(),
        productsHolderPlanId: this.#getProductsHolderPlanId(),
        validationProfiles: this.#getValidationProfiles(),
        validationProfilesEnabled: this.#getValidationProfilesEnabled(),
        accessControlSetupId: this.#getAccessControlSetupId(),
        contactInformationFields: this.#getContactInformationSetup().fields,
        contactInformationFieldsOrder: this.#getContactInformationSetup().fieldsOrder,
        contactInformationRequirement: this.#getContactInformationSetup().requirement,
        sessionAvailabilityCacheStrategy: this.#getSessionAvailabilityCacheStrategy(),
        sessionAvailabilityCacheTimeoutInSeconds: this.#getSessionAvailabilityCacheTimeoutInSeconds(),
        sessionAvailabilityPlanOverrideEnabled: this.#getSessionAvailabilityPlanOverrideEnabled(),
        sessionAvailabilityPlanConfigs: this.#getSessionAvailabilityPlanConfigs(),
        ticketSelectorType: this.#getTicketSelectorType(),
      },
      { emitEvent: false },
    );

    this.formGroup.get('oboPrinterType')?.updateValueAndValidity();

    this.presetCouponsFilterShow.set(!this.onsiteSetup);
    this.prioritizedPlansFilterShow.set(!this.onsiteSetup);
    this.printerConfigurationFormOpened.set(!this.onsiteSetup);
    this.paymentConfigurationAssignmentFormOpened.set(!this.onsiteSetup);
    this.catalogConfigurationFormOpened.set(!this.onsiteSetup);
    this.shiftsConfigurationFormOpened.set(!this.onsiteSetup);
    this.contactInformationConfigurationFormOpened.set(!this.onsiteSetup);
    this.ticketSelectionFormOpened.set(!this.onsiteSetup);
    this.sessionsVisibilityFormOpened.set(!this.onsiteSetup);
    this.validationFormOpened.set(!this.onsiteSetup);
    this.advancedFormOpened.set(false);
    this.sessionAvailabilityFormOpened.set(!this.onsiteSetup);
    this.sessionAvailabilityPlanOverrideEnabled.set(this.#getSessionAvailabilityPlanOverrideEnabled());
    this.#sessionAvailabilityPlanTimeoutControls.clear();
    this.sessionAvailabilityPlanConfigs.set(this.#getSessionAvailabilityPlanConfigs());
    this.#contactInformationSetup.set(this.#getContactInformationSetup());
    this.#rebuildAvailableSessionAvailabilityPlanOptions();
    this.#syncSessionAvailabilityCacheTimeoutControl(this.#parseSessionAvailabilityCacheStrategy());
  }

  #emitNewFormValue(newValue: BoxOfficeOnsiteSetupForm): void {
    this.formChanges.emit(newValue);
    this.reset();
  }

  #loadForm(): void {
    this.#formLoaded.set(false);
    if (this.formGroup) {
      this.#updateForm();
    } else {
      this.#initForm();
    }
    this.#formLoaded.set(true);
  }

  #onValueChanges(): void {
    this.formGroup.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.#destroyRef)).subscribe(formObject => {
      if (this.formGroup.valid) {
        this.newValue = formObject;
      }
    });
  }

  getControlError(control: AbstractControl): string | null {
    const errors = Object.getOwnPropertyNames(control.errors || {}).sort(
      (a, b) => this.#errorPriority.indexOf(a) - this.#errorPriority.indexOf(b),
    );

    return errors.length > 0 ? (errors.shift() ?? null) : null;
  }

  save(): void {
    if (this.isSaveButtonDisabled()) {
      return;
    }

    if (!this.paymentConfigurationAssignmentValid) {
      this.paymentConfigurationSaveAttempted = true;
      this.paymentConfigurationAssignmentFormOpened.set(true);
      this.paymentConfigurationSection()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    this.#emitNewFormValue({
      name: this.newValue?.name ?? this.onsiteSetup?.name ?? '',
      cashRegisters: this.#getCashRegister(),
      onlyTicketsForToday: this.#parseShowOnlyToday(),
      shiftsMandatory: this.#parseShiftStrategy(),
      oboFlowType: OboFlowTypeEnum.one_stop_shop,
      paperType: this.#parsePaperType(),
      cutterType: this.#parseCutterType(),
      priceViewer: this.#parsePriceViewer(),
      showSoldOutSessions: this.#parseShowSoldOutSessions(),
      canOverrideCapacities: this.#parseCanOverrideCapacities(),
      isHidden: this.#parseIsHidden(),
      autovalidateTickets: this.#parseAutovalidateTickets(),
      enablePrintTicketsCombinedForPlans: this.#parseEnablePrintTicketsCombinedForPlans(),
      printTicketsCombinedForPlans: this.#parsePrintTicketsCombinedForPlans(),
      enableShiftMaxHoursOpen: this.#parseEnableShiftMaxHoursOpen(),
      shiftMaxHoursOpen: this.#parseShiftMaxHoursOpen(),
      oboPrinterType: this.#parsePrinterType(),
      receiptPrinterType: this.#parseReceiptPrinterType(),
      hardwareType: this.#parseHardwareType(),
      prioritizedMainPlans: this.#parsePrioritizedPlanList(),
      presetCouponCodes: this.#parsePresetCouponCodes(),
      retailSetupId: this.#parseRetailSetupId(),
      warehouseId: this.#parseWarehouseId(),
      productsHolderPlanId: this.#parseProductsHolderPlanId(),
      validationProfiles: this.#parseValidationProfiles(),
      accessControlSetupId: this.#parseAccessControlSetupId(),
      contactInformationFields: this.contactInformationSetup().fields,
      contactInformationFieldsOrder: this.contactInformationSetup().fieldsOrder,
      contactInformationRequirement: this.contactInformationSetup().requirement,
      channelId: this.formGroup.get('channelId')!.value,
      sessionAvailabilityCacheStrategy: this.#parseSessionAvailabilityCacheStrategy(),
      sessionAvailabilityCacheTimeoutInSeconds: this.#parseSessionAvailabilityCacheTimeoutInSeconds(),
      sessionAvailabilityPlanConfigs: this.#parseSessionAvailabilityPlanConfigs(),
      ticketSelectorType: this.#parseTicketSelectorType(),
      paymentConfigurationAssignment: this.#parsePaymentConfigurationAssignment(),
      ...(this.showBrandingConfiguration() && {
        printConfigurationBundleId: this.#parsePrintConfigurationBundleId(),
      }),
    });
  }

  reset(): void {
    this.formGroup.reset();
    this.newValue = null;
    this.cashRegistersUpdated = false;
    this.plansUpdated = false;
    this.shiftMaxHoursOpenUpdated = false;
    this.paymentConfigurationAssignmentValid = this.#getPaymentConfigurationAssignmentValidity();
    this.paymentConfigurationSaveAttempted = false;
    this.#refreshPaymentConfigurationAssignmentInputs();
    this.selectedProductsHolderPlanOption = null;
    this.selectedRetailSetupOption = null;
    this.selectedWarehouseOption = null;
    this.warehouseOptionsForRetailSetup = [];
    this.productsHolderPlanOptionsForRetailSetup = [];
    this.presetCouponsFilterShow.set(!this.onsiteSetup);
    this.prioritizedPlansFilterShow.set(!this.onsiteSetup);
    this.printerConfigurationFormOpened.set(!this.onsiteSetup);
    this.paymentConfigurationAssignmentFormOpened.set(!this.onsiteSetup);
    this.catalogConfigurationFormOpened.set(!this.onsiteSetup);
    this.shiftsConfigurationFormOpened.set(!this.onsiteSetup);
    this.contactInformationConfigurationFormOpened.set(!this.onsiteSetup);
    this.ticketSelectionFormOpened.set(!this.onsiteSetup);
    this.sessionsVisibilityFormOpened.set(!this.onsiteSetup);
    this.validationFormOpened.set(!this.onsiteSetup);
    this.advancedFormOpened.set(false);
    this.sessionAvailabilityFormOpened.set(!this.onsiteSetup);
    this.sessionAvailabilityPlanOverrideEnabled.set(this.#getSessionAvailabilityPlanOverrideEnabled());
    this.#sessionAvailabilityPlanTimeoutControls.clear();
    this.sessionAvailabilityPlanConfigs.set(this.#getSessionAvailabilityPlanConfigs());
    this.#resetContactInformationSetup();
    this.#rebuildAvailableSessionAvailabilityPlanOptions();
    this.#syncSessionAvailabilityCacheTimeoutControl(this.#parseSessionAvailabilityCacheStrategy());
    this.shouldShowRetailSetupFields.set(false);
    this.formGroup.get('ticketSelectorType')?.setValue(this.#getTicketSelectorType(), { emitEvent: false });
  }

  isSaveButtonDisabled(): boolean {
    return (
      this.#salesChannelService.isLoadingPlans() ||
      !this.#areChannelPlansReady() ||
      !this.formGroup.valid ||
      !this.#isValidShiftConfiguration() ||
      !this.#isValidPrinterConfiguration() ||
      !this.#isValidRetailSetupConfiguration() ||
      !this.#isValidAccessControlConfiguration() ||
      !this.#isValidSessionAvailabilityPlanTimeouts() ||
      !hasContactInformationFields(this.contactInformationSetup()) ||
      !this.#formHasChanges()
    );
  }

  #isValidSessionAvailabilityPlanTimeouts(): boolean {
    return this.sessionAvailabilityPlanConfigs().every(config => {
      if (config.strategy !== SessionAvailabilityCacheStrategyEnum.time_to_live) {
        return true;
      }
      const timeoutControl = this.#sessionAvailabilityPlanTimeoutControls.get(config.plan_id);
      return timeoutControl?.valid ?? true;
    });
  }

  #syncSessionAvailabilityPlanTimeoutControl(
    planId: number,
    strategy: SessionAvailabilityCacheStrategyEnum,
    timeoutInSeconds?: number,
  ): void {
    const timeoutControl = this.#sessionAvailabilityPlanTimeoutControls.get(planId);
    if (!timeoutControl) {
      return;
    }

    if (strategy === SessionAvailabilityCacheStrategyEnum.time_to_live) {
      timeoutControl.enable({ emitEvent: false });
      timeoutControl.setValue(timeoutInSeconds ?? 0, { emitEvent: false });
      timeoutControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    timeoutControl.setValue(0, { emitEvent: false });
    timeoutControl.disable({ emitEvent: false });
    timeoutControl.updateValueAndValidity({ emitEvent: false });
  }

  #syncSessionAvailabilityCacheTimeoutControl(strategy: SessionAvailabilityCacheStrategyEnum): void {
    const timeoutControl = this.formGroup.get('sessionAvailabilityCacheTimeoutInSeconds');
    if (!timeoutControl) {
      return;
    }
    if (strategy === SessionAvailabilityCacheStrategyEnum.time_to_live) {
      timeoutControl.enable({ emitEvent: false });
      timeoutControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    timeoutControl.setValue(0, { emitEvent: false });
    timeoutControl.disable({ emitEvent: false });
    timeoutControl.updateValueAndValidity({ emitEvent: false });
  }

  #isValidShiftConfiguration(): boolean {
    return (
      this.formGroup.get('shiftsMandatory')?.value === ShiftStrategyEnum.disabled ||
      (this.formGroup.get('shiftsMandatory')?.value !== ShiftStrategyEnum.disabled && this.#getCashRegister()?.length > 0)
    );
  }

  #isValidPrinterConfiguration(): boolean {
    const printerTypeControl: AbstractControl | null = this.formGroup.get('oboPrinterType');
    return !printerTypeControl?.errors?.invalidPrinterGatewayCombo;
  }

  #isValidRetailSetupConfiguration(): boolean {
    const retailSetupId: string | null | undefined = this.formGroup.get('retailSetupId')?.value;
    if (!retailSetupId) {
      return true;
    }
    const warehouseId: string | null | undefined = this.formGroup.get('warehouseId')?.value;
    const productsHolderPlanId: number | null | undefined = this.formGroup.get('productsHolderPlanId')?.value;

    return !!(warehouseId && productsHolderPlanId);
  }

  #isValidAccessControlConfiguration(): boolean {
    const validationProfilesEnabled: boolean = this.formGroup.get('validationProfilesEnabled')?.value;
    if (!validationProfilesEnabled) {
      return true;
    }

    const profiles: string[] = this.formGroup.get('validationProfiles')?.value ?? [];

    return profiles.length > 0;
  }

  #formHasChanges(): boolean {
    return Boolean(this.newValue) || this.cashRegistersUpdated || this.plansUpdated || this.shiftMaxHoursOpenUpdated;
  }

  #getCashRegister(): string[] {
    return this.selectedCashRegisterOptions.map(option => option.id);
  }

  selectContactInformationSetup(value: OnsiteContactInformationSetupValue): void {
    this.#contactInformationSetup.set(value);
    this.formGroup.patchValue({
      contactInformationFields: value.fields,
      contactInformationFieldsOrder: value.fieldsOrder,
      contactInformationRequirement: value.requirement,
    });
  }

  getContactInformationFieldsError(): boolean {
    return !hasContactInformationFields(this.contactInformationSetup());
  }

  hasPaymentConfigurationAssignmentError(): boolean {
    return this.paymentConfigurationSaveAttempted && !this.paymentConfigurationAssignmentValid;
  }

  getCashRegisterSelectionError(): boolean {
    return this.formGroup.get('shiftsMandatory')?.value !== ShiftStrategyEnum.disabled && this.#getCashRegister()?.length === 0;
  }

  getCashRegisterSelectionErrorMessage(): string | null {
    if (!this.getCashRegisterSelectionError()) {
      return null;
    }
    return this.#translateService.instant('boxOffice.settings.actions.onsiteSetup.cashRegisters.error');
  }

  allowCashRegisterCustomOption(): boolean {
    return this.placeId != null;
  }

  onCashRegisterCustomOptionAsync(event: MultiSelectCustomOptionAsyncEvent): void {
    if (event.action === 'reset') {
      this.cashRegisterCustomOptionAsync.update(state => ({ ...state, errorMessage: null }));
      return;
    }
    const placeId = this.placeId;
    if (placeId == null) {
      return;
    }
    this.cashRegisterCustomOptionAsync.set({ errorMessage: null, pending: true });
    this.#cashRegistersService
      .createCashRegister(placeId, event.name)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.cashRegisterCustomOptionAsync.set({
            errorMessage: this.#translateService.instant('multiSelect.customOptionResolveFailed'),
            pending: false,
          });
        },
        next: (cashRegisterId: string) => {
          this.cashRegisterCustomOptionAsync.set({ errorMessage: null, pending: false });
          this.cashRegisterCreated.emit({ id: cashRegisterId, name: event.name, placeId });
          const newOption: SelectOption = { id: cashRegisterId, title: event.name };
          this.selectCashRegisters([...this.selectedCashRegisterOptions, newOption]);
        },
      });
  }

  getPrinterTypeError(): string | null {
    const printerTypeControl: AbstractControl | null = this.formGroup.get('oboPrinterType');
    if (printerTypeControl?.errors?.invalidPrinterGatewayCombo) {
      return 'invalidPrinterGatewayCombo';
    }
    return null;
  }

  isPrinterConfigurationFormOpened(): boolean {
    return this.printerConfigurationFormOpened() || this.getPrinterTypeError() !== null;
  }

  toggleItem(toggleSignal: WritableSignal<boolean>): void {
    toggleSignal.set(!toggleSignal());
  }

  #getPrioritizedPlanList(): number[] {
    return this.onsiteSetup?.prioritized_main_plans || [];
  }

  #loadRetailSetupOptions(): void {
    const retailSetups: RetailSetup[] = this.retailSetups.filter(
      setup => setup.warehouses && setup.warehouses.length > 0 && setup.plans && setup.plans.length > 0,
    );
    this.filteredRetailSetups.set(retailSetups);

    this.retailSetupOptions = [
      { id: '', title: this.#translateService.instant('boxOffice.settings.actions.onsiteSetup.retailSetupId.none') },
      ...this.filteredRetailSetups().map((setup: RetailSetup) => ({
        id: setup.id,
        title: setup.name,
      })),
    ];
  }

  #parsePrioritizedPlanList(): number[] {
    return this.formGroup.get('prioritizedMainPlans')?.value ?? [];
  }

  #getPresetCouponCodes(): string[] {
    return this.onsiteSetup?.preset_coupon_codes ?? [];
  }

  #parsePresetCouponCodes(): string[] {
    return this.formGroup.get('presetCouponCodes')?.value ?? [];
  }

  #getRetailSetupId(): string | null {
    return this.onsiteSetup?.retail_setup_id || null;
  }

  #parseRetailSetupId(): string | undefined {
    const retailSetupId: string | null | undefined = this.formGroup.get('retailSetupId')?.value;
    return retailSetupId && retailSetupId !== 'undefined' ? retailSetupId : undefined;
  }

  #getWarehouseId(): string | null {
    return this.onsiteSetup?.warehouse_id || null;
  }

  #parseWarehouseId(): string | undefined {
    const warehouseId = this.formGroup.get('warehouseId')?.value;
    return warehouseId && warehouseId !== 'undefined' ? warehouseId : undefined;
  }

  #getProductsHolderPlanId(): number | null {
    return this.onsiteSetup?.products_holder_plan_id ?? null;
  }

  #parseProductsHolderPlanId(): number | undefined {
    const planId = this.formGroup.get('productsHolderPlanId')?.value;
    return planId != null ? Number(planId) : undefined;
  }

  #parseValidationProfiles(): string[] | undefined {
    const validationProfilesEnabled = this.formGroup.get('validationProfilesEnabled')?.value;
    if (!validationProfilesEnabled) {
      return undefined;
    }

    const profiles = this.formGroup.get('validationProfiles')?.value;
    return profiles != null && profiles.length > 0 ? profiles : undefined;
  }

  #loadPlansForSelectedRetailSetup(retailSetupId: string): void {
    const selectedRetailSetup = this.filteredRetailSetups().find((setup: RetailSetup) => setup.id === retailSetupId);
    if (!selectedRetailSetup?.plans || selectedRetailSetup.plans.length === 0) {
      this.productsHolderPlanOptionsForRetailSetup = [];
      this.selectedProductsHolderPlanOption = null;
      this.formGroup?.get('productsHolderPlanId')?.setValue(null);
      return;
    }

    this.productsHolderPlanOptionsForRetailSetup = this.plans
      .filter(plan => selectedRetailSetup.plans.includes(plan.id))
      .map(plan => ({
        id: plan.id,
        title: plan.name,
      }));

    const selectedProductsHolderPlanId = this.formGroup?.get('productsHolderPlanId')?.value;
    if (selectedProductsHolderPlanId) {
      const selectedPlan = this.productsHolderPlanOptionsForRetailSetup.find(opt => opt.id === selectedProductsHolderPlanId);
      this.selectedProductsHolderPlanOption = selectedPlan ?? null;
    } else if (this.productsHolderPlanOptionsForRetailSetup.length === 1) {
      const autoSelectedPlan = this.productsHolderPlanOptionsForRetailSetup[0];
      this.selectedProductsHolderPlanOption = autoSelectedPlan;
      this.formGroup?.get('productsHolderPlanId')?.setValue(autoSelectedPlan.id);
    } else {
      this.selectedProductsHolderPlanOption = null;
    }
  }

  #loadWarehousesForSelectedRetailSetup(retailSetupId: string): void {
    const selectedRetailSetup = this.filteredRetailSetups().find((setup: RetailSetup) => setup.id === retailSetupId);
    if (!selectedRetailSetup?.warehouses) {
      this.warehouseOptionsForRetailSetup = [];
      this.selectedWarehouseOption = null;
      this.formGroup?.get('warehouseId')?.setValue(null);
      return;
    }

    this.warehouseOptionsForRetailSetup = selectedRetailSetup.warehouses.map(warehouse => ({
      id: warehouse.id,
      title: warehouse.name,
    }));

    const selectedWarehouseId = this.formGroup?.get('warehouseId')?.value;
    if (selectedWarehouseId) {
      const selectedWarehouse = this.warehouseOptionsForRetailSetup.find(opt => opt.id === selectedWarehouseId);
      this.selectedWarehouseOption = selectedWarehouse ?? null;
    } else if (this.warehouseOptionsForRetailSetup.length === 1) {
      const autoSelectedWarehouse = this.warehouseOptionsForRetailSetup[0];
      this.selectedWarehouseOption = autoSelectedWarehouse;
      this.formGroup?.get('warehouseId')?.setValue(autoSelectedWarehouse.id);
    } else {
      this.selectedWarehouseOption = null;
    }
  }

  #getValidationProfiles(): string[] {
    return this.onsiteSetup?.validation_profiles ?? [];
  }

  #getValidationProfilesEnabled(): boolean {
    return (this.onsiteSetup?.validation_profiles?.length ?? 0) > 0 || !!this.onsiteSetup?.access_control_setup_id;
  }

  #loadSelectedValidationProfile(): void {
    const profiles = this.#getValidationProfiles();

    const selectedProfiles =
      profiles.length > 0 && this.filteredValidationProfilesOptions.length > 0
        ? this.filteredValidationProfilesOptions.filter(option => profiles.includes(option.id))
        : [];

    this.selectValidationProfiles(selectedProfiles);
  }

  selectValidationProfiles(options: SelectOption[]): void {
    this.selectedValidationProfilesOptions = [...options];
    this.formGroup?.get('validationProfiles')?.setValue(options.map(option => option.id));
  }

  #getAccessControlSetupId(): string | null {
    return this.onsiteSetup?.access_control_setup_id || null;
  }

  #getContactInformationSetup(): OnsiteContactInformationSetupValue {
    return toOnsiteContactInformationSetupValue(
      this.onsiteSetup?.contact_information_setup,
      this.onsiteSetup ? null : NEW_ONSITE_SETUP_CONTACT_INFORMATION_FIELDS_ORDER,
    );
  }

  #resetContactInformationSetup(): void {
    const value = this.#getContactInformationSetup();
    this.#contactInformationSetup.set(value);
    this.formGroup.patchValue(
      {
        contactInformationFields: value.fields,
        contactInformationFieldsOrder: value.fieldsOrder,
        contactInformationRequirement: value.requirement,
      },
      { emitEvent: false },
    );
  }

  #parseAccessControlSetupId(): string | undefined {
    const validationProfilesEnabled = this.formGroup.get('validationProfilesEnabled')?.value;
    if (!validationProfilesEnabled) {
      return undefined;
    }

    const setupId: string | null | undefined = this.formGroup.get('accessControlSetupId')?.value;
    return setupId && setupId !== 'undefined' ? setupId : undefined;
  }

  #loadSelectedAccessControlSetup(): void {
    const setupId = this.#getAccessControlSetupId();

    let selectedSetup: SelectOption | undefined = undefined;
    if (setupId && this.accessControlSetupsOptions.length > 0) {
      selectedSetup = this.accessControlSetupsOptions.find(option => setupId === option.id);
    }
    this.selectedAccessControlSetupOption = selectedSetup || null;

    this.formGroup?.get('accessControlSetupId')?.setValue(this.selectedAccessControlSetupOption?.id || null);

    this.#filterValidationProfiles();
    this.#loadSelectedValidationProfile();
  }

  selectAccessControlSetup(option: SelectOption | null): void {
    this.selectedAccessControlSetupOption = option;

    if (!option || option.id === undefined) {
      this.formGroup?.get('accessControlSetupId')?.setValue(null);
    } else {
      this.formGroup?.get('accessControlSetupId')?.setValue(option.id);
    }

    this.#filterValidationProfiles();
  }

  #filterValidationProfiles(): void {
    const selectedSetupId = this.selectedAccessControlSetupOption?.id;

    this.filteredValidationProfilesOptions = selectedSetupId
      ? this.validationProfilesOptions.filter(profile => profile.setupId === selectedSetupId)
      : [];

    const remainingProfiles = this.selectedValidationProfilesOptions.filter(profile => profile.setupId === selectedSetupId);
    if (remainingProfiles.length !== this.selectedValidationProfilesOptions.length) {
      this.selectValidationProfiles(remainingProfiles);
    }
  }
}
