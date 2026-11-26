import { NgFor, NgIf } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  forwardRef,
  inject,
  Input,
  OnChanges,
  Signal,
  signal,
  SimpleChanges,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { FeverOnlyMarkerComponent } from '@fz-original/app/shared/components/fever-only-marker/fever-only-marker.component';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntIconComponent } from '@ignite/icon';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { MultiSelectComponent } from '../../../../shared/layout/filters/multi-select/multi-select.component';
import { MultiSelectModule } from '../../../../shared/layout/filters/multi-select/multi-select.module';
import { PlanType } from '../../models/general-section.enum';
import { PartnershipType } from '../../models/partnership-type.enum';
import { ContractSectionConfig } from '../../models/settings-configs.model';
import { MainPlanSettingsService } from '../../services/main-plan-settings.service';
import { formatFallbackLabel } from '../../utils/format-fallback-label.util';
import { isSuperuserOnlyField as isSuperuserOnlyFieldUtil } from '../../utils/is-superuser-only-field.util';

const PLAN_TYPES_WITHOUT_CONTRACT_FIELDS: PlanType[] = [PlanType.waitlist, PlanType.giveaway, PlanType.growth, PlanType.prizeDraw];

const PARTNERSHIP_TYPE_LABELS: Partial<Record<PartnershipType, string>> = {
  [PartnershipType.coInvestment]: 'eventSettings.contract.partnershipType.coInvestment',
  [PartnershipType.feverOwned]: 'eventSettings.contract.partnershipType.feverOwned',
  [PartnershipType.jointVenture]: 'eventSettings.contract.partnershipType.jointVenture',
  [PartnershipType.licensing]: 'eventSettings.contract.partnershipType.licensing',
  [PartnershipType.marketplaceApi]: 'eventSettings.contract.partnershipType.marketplaceApi',
  [PartnershipType.officialPartnership]: 'eventSettings.contract.partnershipType.officialPartnership',
  [PartnershipType.other]: 'eventSettings.contract.partnershipType.other',
};

interface ContractSectionData {
  contracts?: string[];
  partnershipType?: string;
}

@Component({
  selector: 'app-contract-section',
  templateUrl: './contract-section.component.html',
  styleUrls: ['./contract-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    FeverOnlyMarkerComponent,
    IgntIconComponent,
    IgntTypeaheadModule,
    IgntWrapperCardComponent,
    MultiSelectModule,
    NgFor,
    NgIf,
    ReactiveFormsModule,
    TranslateModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ContractSectionComponent),
      multi: true,
    },
  ],
})
export class ContractSectionComponent implements AfterViewInit, ControlValueAccessor, OnChanges {
  #changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  #loadContractsTrigger = new Subject<{ mainPlanId: number; partnerId: number }>();
  #mainPlanSettingsService = inject(MainPlanSettingsService);
  #onChange: (value: ContractSectionData) => void = () => {};
  #onTouched: () => void = () => {};
  #partner: Partner | null = null;
  #partnerService = inject(PartnerService);
  #pendingContracts: string[] | null = null;
  #reorderQueued = false;
  #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);
  #planType: WritableSignal<PlanType | undefined> = signal(undefined);

  get canEditContracts(): boolean {
    return this.config?.contracts.editable ?? false;
  }

  get canEditPartnershipType(): boolean {
    return this.config?.partnershipType.editable ?? true;
  }

  get canViewContracts(): boolean {
    return this.config?.contracts.visible ?? false;
  }

  get canViewPartnershipType(): boolean {
    return this.config?.partnershipType.visible ?? true;
  }
  @Input() config: ContractSectionConfig | null = null;
  contractOptions: Signal<SelectOption[]> = toSignal(
    this.#loadContractsTrigger.pipe(
      switchMap(({ partnerId, mainPlanId }) =>
        this.#mainPlanSettingsService.getContracts(partnerId, mainPlanId).pipe(
          map(contracts =>
            contracts.map(contract => ({
              id: contract.id,
              title: contract.name,
            })),
          ),
          catchError(() => of([])),
        ),
      ),
      tap(options => {
        if (this.#pendingContracts && this.#pendingContracts.length > 0) {
          this.#updateSelectedContracts(this.#pendingContracts, options);
          this.#pendingContracts = null;
        }
        this.#scheduleReorder(true);
      }),
    ),
    { initialValue: [] },
  );
  @ViewChild('contractsMultiSelect') contractsMultiSelect!: MultiSelectComponent;
  isDisabled = signal(false);
  @Input() mainPlanId: number | null = null;
  partnershipTypeOptions: SelectOption[] = [];
  selectedContracts: WritableSignal<SelectOption[]> = signal([]);

  @Input() set planType(value: PlanType | undefined) {
    this.#planType.set(value);
  }
  selectedPartnershipType: WritableSignal<SelectOption | undefined> = signal(undefined);
  showContractsFields: Signal<boolean> = computed(() => {
    const selectedPartnershipType = this.selectedPartnershipType()?.id;
    const currentPlanType = this.#planType();

    if (selectedPartnershipType === PartnershipType.feverOwned) {
      return false;
    }

    if (currentPlanType && PLAN_TYPES_WITHOUT_CONTRACT_FIELDS.includes(currentPlanType)) {
      return false;
    }

    return true;
  });

  constructor() {
    this.#partner = this.#partnerService.getPartner();
    this.#initializePartnershipTypeOptions();
  }

  ngAfterViewInit(): void {
    this.#reorderContractOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      if (this.config.partnershipType.allowed) {
        this.partnershipTypeOptions = this.config.partnershipType.allowed.map((apiValue: string) => {
          const translationKey = PARTNERSHIP_TYPE_LABELS[apiValue as PartnershipType];
          let title: string;

          if (translationKey !== undefined) {
            const translated = this.#translateService.instant(translationKey);
            title = translated !== translationKey ? translated : formatFallbackLabel(apiValue);
          } else {
            title = formatFallbackLabel(apiValue);
          }

          return {
            id: apiValue,
            title,
          };
        });
      }

      if (this.config.contracts.visible && this.#partner && this.mainPlanId) {
        this.#loadContracts(this.#partner.id, this.mainPlanId);
      }
    }
  }

  onContractRemoved(contractToRemove: SelectOption): void {
    const currentContracts = this.selectedContracts();
    const updatedContracts = currentContracts.filter(contract => contract.id !== contractToRemove.id);
    this.selectedContracts.set(updatedContracts);
    this.#changeDetectorRef.detectChanges();
    this.#scheduleReorder();
    this.#emitChange();
    this.#onTouched();
  }

  onContractsSelected(selectedOptions: SelectOption[]): void {
    this.selectedContracts.set(selectedOptions);
    this.#scheduleReorder();
    this.#emitChange();
    this.#onTouched();
  }

  isSuperuserOnlyField(fieldConfig: Parameters<typeof isSuperuserOnlyFieldUtil>[0], isEditableInUi = true): boolean {
    return isSuperuserOnlyFieldUtil(fieldConfig, this.#userService.getUser()?.isStaff() ?? false, isEditableInUi);
  }

  onPartnershipTypeSelected(option: SelectOption): void {
    this.selectedPartnershipType.set(option);
    this.#emitChange();
    this.#onTouched();
  }

  registerOnChange(fn: (value: ContractSectionData) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  writeValue(value: ContractSectionData): void {
    if (value?.partnershipType !== undefined) {
      this.selectedPartnershipType.set(this.partnershipTypeOptions.find(opt => opt.id === value.partnershipType));
    } else {
      this.selectedPartnershipType.set(undefined);
    }

    if (value?.contracts !== undefined && value.contracts.length > 0) {
      this.#pendingContracts = value.contracts;
      this.#updateSelectedContracts(value.contracts, this.contractOptions());
    } else {
      this.#pendingContracts = null;
      this.selectedContracts.set([]);
    }
  }

  #emitChange(): void {
    const partnershipType = this.selectedPartnershipType()?.id as string | undefined;
    const contracts = this.selectedContracts().map(opt => opt.id);
    this.#onChange({ contracts, partnershipType });
  }

  #initializePartnershipTypeOptions(): void {
    this.partnershipTypeOptions = Object.entries(PARTNERSHIP_TYPE_LABELS).map(([apiValue, titleKey]) => ({
      id: apiValue,
      title: this.#translateService.instant(titleKey),
    }));
  }

  #loadContracts(partnerId: number, mainPlanId: number): void {
    this.#loadContractsTrigger.next({ partnerId, mainPlanId });
  }

  #reorderContractOptions(): void {
    if (this.contractsMultiSelect) {
      this.contractsMultiSelect.reorderOptions();
      this.#changeDetectorRef.detectChanges();
    }
  }

  #scheduleReorder(force = false): void {
    if (this.#reorderQueued && !force) {
      return;
    }
    this.#reorderQueued = true;
    queueMicrotask(() => {
      this.#reorderQueued = false;
      this.#reorderContractOptions();
    });
  }

  #updateSelectedContracts(contractIds: string[], options: SelectOption[]): void {
    const selectedContractOptions = options.filter(opt => contractIds.includes(opt.id));
    this.selectedContracts.set(selectedContractOptions);
    this.#scheduleReorder();
  }
}
