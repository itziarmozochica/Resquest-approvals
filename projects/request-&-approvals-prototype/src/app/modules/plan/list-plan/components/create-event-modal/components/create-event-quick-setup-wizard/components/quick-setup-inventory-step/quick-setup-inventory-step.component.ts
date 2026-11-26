import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  Injector,
  input,
  linkedSignal,
  LOCALE_ID,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { ProductTaxRate } from '@fz-original/app/shared/services/tax-area/product-tax-area.model';
import { TaxAreaService } from '@fz-original/app/shared/services/tax-area/tax-area.service';
import { IgntAlertComponent, IgntButtonComponent, IgntMediaQueriesService, IgntTooltipDirective } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule } from '@ngx-translate/core';
import { merge } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';

import {
  QUICK_SETUP_DEFAULT_CAPACITY_GROUP_FREQUENCY,
  QuickSetupInventoryAssignedIds,
  QuickSetupInventoryGroupForm,
  QuickSetupInventoryGroupFormValue,
  QuickSetupInventoryItemForm,
  QuickSetupInventoryItemFormValue,
  QuickSetupInventoryPayload,
  QuickSetupInventoryPrefill,
} from '../../../../models/quick-setup-inventory.model';
import { resolveQuickSetupInventoryRowIds } from '../../../../utils/resolve-quick-setup-inventory-row-ids.util';
import { formatCurrencyDisplay } from '../../utils/plan-currency.util';
import { QuickSetupInventoryDropHintComponent } from './components/quick-setup-inventory-drop-hint/quick-setup-inventory-drop-hint.component';
import { QuickSetupInventoryGroupComponent } from './components/quick-setup-inventory-group/quick-setup-inventory-group.component';
import { QuickSetupInventoryRowKind } from './components/quick-setup-inventory-row/quick-setup-inventory-row-kind.enum';
import { QuickSetupInventoryRowComponent } from './components/quick-setup-inventory-row/quick-setup-inventory-row.component';
import {
  groupHasTicketsValidator,
  neededSessionTypeValidator,
  ticketsAllowedRangeValidator,
  tierPricesValidator,
  uniqueNameValidator,
} from './quick-setup-inventory-step.validators';
import { mapQuickSetupInventoryGroup } from './utils/map-quick-setup-inventory-group.util';
import { mapQuickSetupInventoryItem, QUICK_SETUP_NO_RULE_OPTION_ID } from './utils/map-quick-setup-inventory-item.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntSkeletonBaseComponent,
    IgntToggleComponent,
    IgntTooltipDirective,
    QuickSetupInventoryDropHintComponent,
    QuickSetupInventoryGroupComponent,
    QuickSetupInventoryRowComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-quick-setup-inventory-step',
  styleUrl: './quick-setup-inventory-step.component.scss',
  templateUrl: './quick-setup-inventory-step.component.html',
})
export class QuickSetupInventoryStepComponent {
  static readonly scrollFieldSelector = '[data-scroll-field]';
  static readonly pricesByTierToggleId = 'create-event-quick-setup-prices-by-tier';
  static readonly reducedMotionQuery = '(prefers-reduced-motion: reduce)';

  readonly #destroyRef = inject(DestroyRef);
  readonly #document = inject(DOCUMENT);
  readonly #formBuilder = inject(FormBuilder);
  readonly #injector = inject(Injector);
  readonly #locale = inject(LOCALE_ID);
  readonly #mediaQueries = inject(IgntMediaQueriesService);
  readonly #nonNullableFormBuilder = inject(NonNullableFormBuilder);
  readonly #taxAreaService = inject(TaxAreaService);
  #fieldFocusScrollTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #appliedPrefill: QuickSetupInventoryPrefill | null = null;
  readonly #lastNamesByRow = new WeakMap<QuickSetupInventoryItemForm, string>();

  readonly assignedIds = input<QuickSetupInventoryAssignedIds | null>(null);
  readonly isCurrencyLoadFailed = input(false);
  readonly isCurrencyLoading = input(false);
  readonly placeId = input.required<number>();
  readonly planId = input.required<number>();
  readonly prefill = input<QuickSetupInventoryPrefill | null>(null);
  readonly submitRequest = input<number>(0);
  /** ISO 4217 code the plan stores for the venue set in Content; null when the plan has none or it could not be read. */
  readonly venueCurrency = input<string | null>(null);
  readonly submitAborted = output<void>();
  readonly submitPayload = output<QuickSetupInventoryPayload>();
  readonly taxAreaLoadError = output<void>();
  readonly validityChange = output<boolean>();

  protected readonly currencyDisplay = computed(() => {
    const currency = this.venueCurrency();

    if (currency === null || currency.length === 0) {
      return null;
    }

    return formatCurrencyDisplay(currency, this.#locale);
  });
  protected readonly isLoadingTaxArea = signal(true);
  protected readonly isPricesByTier = signal(false);
  protected readonly pricesByTierToggleId = QuickSetupInventoryStepComponent.pricesByTierToggleId;
  protected readonly productTypeOptions = signal<SelectOption[]>([]);
  protected readonly rowKind = QuickSetupInventoryRowKind;
  readonly #addedGroup = signal<QuickSetupInventoryGroupForm | null>(null);
  protected readonly addedGroup = this.#addedGroup.asReadonly();
  readonly #revealErrorsRequest = signal(0);
  protected readonly revealErrorsRequest = this.#revealErrorsRequest.asReadonly();
  readonly #loadedTaxAreaKey = signal<string | null>(null);
  protected readonly addOns = this.#formBuilder.array<QuickSetupInventoryItemForm>([]);
  protected readonly groups = this.#formBuilder.array<QuickSetupInventoryGroupForm>([]);
  protected readonly ungroupedTickets = this.#formBuilder.array<QuickSetupInventoryItemForm>([]);
  protected readonly form = this.#formBuilder.group({
    addOns: this.addOns,
    groups: this.groups,
    totalCapacity: [null as number | null, [Validators.required, Validators.min(1)]],
    ungroupedTickets: this.ungroupedTickets,
  });
  readonly #formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  readonly #formState = toSignal(
    merge(this.form.statusChanges, this.form.valueChanges).pipe(
      startWith(null),
      tap(() => {
        this.#refreshDependentValidators();
      }),
      map(() => this.form.valid),
    ),
    { initialValue: this.form.valid },
  );
  protected readonly isFormValid = computed(() => this.#formState() && !this.isLoadingTaxArea());
  protected readonly ticketRows = computed(() => {
    this.#formValue();

    return this.#allTicketRows();
  });
  protected readonly canDeleteTicket = computed(() => this.ticketRows().length > 1);
  protected readonly ticketIndexes = computed(() => new Map(this.ticketRows().map((row, index) => [row, index])));
  readonly #neededSessionTypeOptionsByTicket = linkedSignal<
    Map<QuickSetupInventoryItemForm, string[]>,
    Map<QuickSetupInventoryItemForm, SelectOption[]>
  >({
    computation: (namesByTicket, previous) =>
      new Map(
        [...namesByTicket].map(([ticket, names]) => {
          const previousOptions = previous?.value.get(ticket);
          const isUnchanged =
            previousOptions !== undefined &&
            previousOptions.length === names.length &&
            previousOptions.every((option, index) => option.id === names[index]);

          return [ticket, isUnchanged ? previousOptions : names.map(name => ({ id: name, title: name }))];
        }),
      ),
    source: () => new Map([...this.ticketRows(), ...this.addOns.controls].map(row => [row, this.#collectNeededSessionTypeNames(row)])),
  });
  protected readonly neededSessionTypeOptionsByTicket = this.#neededSessionTypeOptionsByTicket.asReadonly();
  constructor() {
    this.ungroupedTickets.push(this.#createTicketRow());
    this.#destroyRef.onDestroy(() => {
      this.#clearFieldFocusScrollTimeout();
    });
    this.form.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#followRenamedNeededSessionTypes());

    effect(() => {
      const planId = this.planId();
      const placeId = this.placeId();
      const taxAreaKey = planId && placeId ? `${planId}:${placeId}` : null;

      if (!taxAreaKey || this.#loadedTaxAreaKey() === taxAreaKey) {
        return;
      }

      this.#loadTaxArea(planId, placeId);
    });

    effect(() => {
      this.isPricesByTier();
      this.#refreshPriceValidators();
    });

    effect(() => {
      this.validityChange.emit(this.isFormValid());
    });

    effect(() => {
      const prefill = this.prefill();

      if (!prefill || prefill === this.#appliedPrefill) {
        return;
      }

      untracked(() => this.#applyPrefill(prefill));
    });

    effect(() => {
      const assignedIds = this.assignedIds();

      if (!assignedIds) {
        return;
      }

      untracked(() => this.#applyAssignedIds(assignedIds));
    });

    effect(() => {
      const request = this.submitRequest();

      if (request === 0) {
        return;
      }

      untracked(() => this.#handleSubmitRequest());
    });
  }

  protected addAddOn(): void {
    this.addOns.push(this.#createAddOnRow());
    this.#refreshPriceValidators();
  }

  protected addGroup(): void {
    const group = this.#createGroupRow();

    this.groups.push(group);
    this.#addedGroup.set(group);
  }

  protected addTicketToGroup(group: QuickSetupInventoryGroupForm): void {
    this.#addTicketTo(group.controls.tickets);
  }

  protected addUngroupedTicket(): void {
    this.#addTicketTo(this.ungroupedTickets);
  }

  protected onFieldFocus(event: FocusEvent): void {
    if (!this.#mediaQueries.isMobile() && !this.#mediaQueries.isTablet()) {
      return;
    }

    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const field = target.closest(QuickSetupInventoryStepComponent.scrollFieldSelector);

    if (!field) {
      return;
    }

    this.#clearFieldFocusScrollTimeout();

    this.#fieldFocusScrollTimeoutId = setTimeout(() => {
      this.#fieldFocusScrollTimeoutId = null;
      field.scrollIntoView({ behavior: this.#scrollBehavior(), block: 'center', inline: 'nearest' });
    }, 300);
  }

  #clearFieldFocusScrollTimeout(): void {
    if (this.#fieldFocusScrollTimeoutId !== null) {
      clearTimeout(this.#fieldFocusScrollTimeoutId);
      this.#fieldFocusScrollTimeoutId = null;
    }
  }

  #scrollBehavior(): ScrollBehavior {
    return this.#document.defaultView?.matchMedia(QuickSetupInventoryStepComponent.reducedMotionQuery).matches === true ? 'auto' : 'smooth';
  }

  protected onPricesByTierChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked; // the toggle renders a native checkbox, so its target is an input
    this.#setPricesByTier(checked);
    this.#refreshPriceValidators();
  }

  #setPricesByTier(checked: boolean): void {
    this.isPricesByTier.set(checked);

    const priceRows = [...this.#allTicketRows(), ...this.addOns.controls];

    priceRows.forEach(row => {
      if (checked && row.controls.normalPrice.value == null && row.controls.price.value != null) {
        row.controls.normalPrice.setValue(row.controls.price.value);
      }

      if (!checked && row.controls.price.value == null && row.controls.normalPrice.value != null) {
        row.controls.price.setValue(row.controls.normalPrice.value);
      }

      if (checked) {
        this.#resetTierPriceFieldState(row);
      }
    });
  }

  protected onTicketDropped(event: CdkDragDrop<FormArray<QuickSetupInventoryItemForm>>): void {
    const { container, currentIndex, previousContainer, previousIndex } = event;

    if (previousContainer === container && previousIndex === currentIndex) {
      return;
    }

    const ticket = previousContainer.data.at(previousIndex);
    previousContainer.data.removeAt(previousIndex);
    container.data.insert(currentIndex, ticket);
  }

  protected removeAddOn(addOn: QuickSetupInventoryItemForm): void {
    this.#forgetNeededSessionType(addOn);
    this.addOns.removeAt(this.addOns.controls.indexOf(addOn));
  }

  protected removeGroup(group: QuickSetupInventoryGroupForm): void {
    const tickets = [...group.controls.tickets.controls];

    group.controls.tickets.clear({ emitEvent: false });
    tickets.forEach(ticket => this.ungroupedTickets.push(ticket, { emitEvent: false }));
    this.groups.removeAt(this.groups.controls.indexOf(group));
  }

  protected removeTicket(ticket: QuickSetupInventoryItemForm): void {
    const rows = ticket.parent;

    if (!this.canDeleteTicket() || !(rows instanceof FormArray)) {
      return;
    }

    this.#forgetNeededSessionType(ticket);
    rows.removeAt(rows.controls.indexOf(ticket));
  }

  #addTicketTo(rows: FormArray<QuickSetupInventoryItemForm>): void {
    rows.push(this.#createTicketRow());
    this.#refreshPriceValidators();
  }

  #allSessionTypeRows(): QuickSetupInventoryItemForm[] {
    return [...this.#allTicketRows(), ...this.addOns.controls];
  }

  #allTicketRows(): QuickSetupInventoryItemForm[] {
    return [...this.groups.controls.flatMap(group => group.controls.tickets.controls), ...this.ungroupedTickets.controls];
  }

  #applyAssignedIds(assignedIds: QuickSetupInventoryAssignedIds): void {
    this.#applyRowIds(this.groups.controls, assignedIds.groupIdsByName);
    this.#applyRowIds(this.#allTicketRows(), assignedIds.ticketIdsByName);
    this.#applyRowIds(this.addOns.controls, assignedIds.addOnIdsByName);
  }

  #applyRowIds(rows: (QuickSetupInventoryItemForm | QuickSetupInventoryGroupForm)[], idsByName: Record<string, number>): void {
    const resolvedIds = resolveQuickSetupInventoryRowIds(
      rows.map(row => ({ id: row.controls.id.value, name: String(row.controls.name.value ?? '') })),
      idsByName,
    );

    rows.forEach((row, index) => row.controls.id.setValue(resolvedIds[index], { emitEvent: false }));
  }

  #applyPrefill(prefill: QuickSetupInventoryPrefill): void {
    this.#appliedPrefill = prefill;

    this.groups.clear({ emitEvent: false });
    this.ungroupedTickets.clear({ emitEvent: false });
    this.addOns.clear({ emitEvent: false });
    this.form.controls.totalCapacity.setValue(prefill.totalCapacity);

    for (const group of prefill.groups) {
      this.groups.push(this.#createPrefilledGroupRow(group), { emitEvent: false });
    }

    for (const ticket of prefill.ungroupedTickets) {
      this.ungroupedTickets.push(this.#createPrefilledRow(this.#createTicketRow(), ticket), { emitEvent: false });
    }

    if (this.#allTicketRows().length === 0) {
      (this.groups.at(0)?.controls.tickets ?? this.ungroupedTickets).push(this.#createTicketRow(), { emitEvent: false });
    }

    for (const addOn of prefill.addOns) {
      this.addOns.push(this.#createPrefilledRow(this.#createAddOnRow(), addOn), { emitEvent: false });
    }

    this.#setPricesByTier(prefill.isPricesByTier);
    this.form.updateValueAndValidity();
    this.#refreshPriceValidators();
  }

  #createAddOnRow(): QuickSetupInventoryItemForm {
    return this.#nonNullableFormBuilder.group(
      {
        details: [''],
        id: [null as number | null],
        instructions: [''],
        maxCapacity: [null as number | null, [Validators.required, Validators.min(1)]],
        maxToSell: [null as number | null],
        minToSell: [null as number | null],
        name: ['', [Validators.required, uniqueNameValidator(control => this.#siblingNamesFor(this.#allSessionTypeRows(), control))]],
        neededSessionTypes: [[] as string[]],
        normalPrice: [null as number | null],
        peakPrice: [null as number | null],
        price: [null as number | null, [Validators.required, Validators.min(0)]],
        productType: ['', [Validators.required]],
        selectionRule: [QUICK_SETUP_NO_RULE_OPTION_ID],
        valleyPrice: [null as number | null],
      },
      {
        validators: [neededSessionTypeValidator(control => this.#neededSessionTypeNamesFor(control))],
      },
    );
  }

  #createGroupRow(): QuickSetupInventoryGroupForm {
    return this.#nonNullableFormBuilder.group(
      {
        frequency: [QUICK_SETUP_DEFAULT_CAPACITY_GROUP_FREQUENCY],
        id: [null as number | null],
        maxCapacity: [null as number | null, [Validators.required, Validators.min(1)]],
        name: ['', [Validators.required, uniqueNameValidator(control => this.#siblingNamesFor(this.groups.controls, control))]],
        tickets: this.#nonNullableFormBuilder.array<QuickSetupInventoryItemForm>([]),
      },
      { validators: [groupHasTicketsValidator()] },
    );
  }

  #createPrefilledGroupRow(value: QuickSetupInventoryGroupFormValue): QuickSetupInventoryGroupForm {
    const group = this.#createGroupRow();

    group.patchValue({ frequency: value.frequency, id: value.id, maxCapacity: value.maxCapacity, name: value.name }, { emitEvent: false });

    for (const ticket of value.tickets) {
      group.controls.tickets.push(this.#createPrefilledRow(this.#createTicketRow(), ticket), { emitEvent: false });
    }

    return group;
  }

  #createTicketRow(): QuickSetupInventoryItemForm {
    return this.#nonNullableFormBuilder.group(
      {
        details: [''],
        id: [null as number | null],
        instructions: [''],
        maxCapacity: [null as number | null, [Validators.min(1)]],
        maxToSell: [null as number | null, [Validators.min(1)]],
        minToSell: [null as number | null, [Validators.min(1)]],
        name: ['', [Validators.required, uniqueNameValidator(control => this.#siblingNamesFor(this.#allSessionTypeRows(), control))]],
        neededSessionTypes: [[] as string[]],
        normalPrice: [null as number | null],
        peakPrice: [null as number | null],
        price: [null as number | null, [Validators.required, Validators.min(0)]],
        productType: ['', [Validators.required]],
        selectionRule: [QUICK_SETUP_NO_RULE_OPTION_ID],
        valleyPrice: [null as number | null],
      },
      {
        validators: [ticketsAllowedRangeValidator(), neededSessionTypeValidator(control => this.#neededSessionTypeNamesFor(control))],
      },
    );
  }

  #createPrefilledRow(row: QuickSetupInventoryItemForm, value: QuickSetupInventoryItemFormValue): QuickSetupInventoryItemForm {
    row.patchValue(value, { emitEvent: false });

    return row;
  }

  #buildPayload(): QuickSetupInventoryPayload | null {
    if (this.isLoadingTaxArea() || this.form.invalid) {
      return null;
    }

    const totalCapacity = this.form.controls.totalCapacity.value;
    const isPricesByTier = this.isPricesByTier();

    if (totalCapacity == null) {
      return null;
    }

    return {
      add_ons: this.addOns.controls.map(addOn => mapQuickSetupInventoryItem(addOn.getRawValue(), isPricesByTier)),
      capacity_groups: this.groups.controls.map(group => mapQuickSetupInventoryGroup(group.getRawValue(), isPricesByTier)),
      total_capacity: totalCapacity,
      ungrouped_tickets: this.ungroupedTickets.controls.map(ticket => mapQuickSetupInventoryItem(ticket.getRawValue(), isPricesByTier)),
    };
  }

  #handleSubmitRequest(): void {
    const assignedIds = this.assignedIds();

    if (assignedIds) {
      this.#applyAssignedIds(assignedIds);
    }

    const payload = this.#buildPayload();

    if (!payload) {
      this.form.markAllAsTouched();
      this.#revealErrorsRequest.update(request => request + 1);
      afterNextRender(() => this.#revalidate(this.form), { injector: this.#injector });
      this.submitAborted.emit();
      return;
    }

    this.submitPayload.emit(payload);
  }

  #handleTaxAreaLoadFailure(): void {
    this.isLoadingTaxArea.set(false);
    this.taxAreaLoadError.emit();
  }

  #revalidate(control: AbstractControl): void {
    if (control instanceof FormGroup || control instanceof FormArray) {
      Object.values(control.controls).forEach(child => this.#revalidate(child));
    }

    control.updateValueAndValidity({ onlySelf: true });
  }

  #loadTaxArea(planId: number, placeId: number): void {
    this.isLoadingTaxArea.set(true);

    this.#taxAreaService
      .getTaxArea(planId, placeId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => this.#handleTaxAreaLoadFailure(),
        next: response => {
          const productTaxRates = response.data?.productTaxRates ?? [];

          if (productTaxRates.length === 0) {
            this.#handleTaxAreaLoadFailure();
            return;
          }

          this.#loadedTaxAreaKey.set(`${planId}:${placeId}`);
          this.productTypeOptions.set(this.#mapProductTypeOptions(productTaxRates));
          this.isLoadingTaxArea.set(false);
        },
      });
  }

  #mapProductTypeOptions(productTaxRates: ProductTaxRate[]): SelectOption[] {
    return productTaxRates.map(rate => ({
      id: rate.productType,
      title: rate.humanizedProductType,
    }));
  }

  #collectNeededSessionTypeNames(excludedRow: QuickSetupInventoryItemForm | null): string[] {
    const names = this.#allSessionTypeRows()
      .filter(row => row !== excludedRow)
      .map(row => String(row.controls.name.value ?? '').trim())
      .filter(name => name.length > 0);

    return [...new Set(names)];
  }

  #followRenamedNeededSessionTypes(): void {
    const rows = this.#allSessionTypeRows();
    const renames = this.#claimRowNames(rows);

    if (renames.size === 0) {
      return;
    }

    for (const row of rows) {
      const neededSessionTypes = row.controls.neededSessionTypes.value;

      if (neededSessionTypes.some(neededSessionType => renames.has(neededSessionType))) {
        row.controls.neededSessionTypes.setValue([
          ...new Set(neededSessionTypes.map(neededSessionType => renames.get(neededSessionType) ?? neededSessionType)),
        ]);
      }
    }
  }

  #claimRowNames(rows: QuickSetupInventoryItemForm[]): Map<string, string> {
    const renames = new Map<string, string>();
    let pendingRows = rows.filter(row => {
      const name = this.#rowName(row);

      return (
        name.length > 0 && name !== this.#lastNamesByRow.get(row) && !rows.some(other => other !== row && this.#rowName(other) === name)
      );
    });

    while (pendingRows.length > 0) {
      const freeRows = pendingRows.filter(row => this.#recordedOwnerOf(rows, this.#rowName(row)) === undefined);
      const claimingRows = freeRows.length > 0 ? freeRows : this.#findNameSwap(rows, pendingRows);

      if (claimingRows.length === 0) {
        break;
      }

      const previousNames = claimingRows.map(row => this.#lastNamesByRow.get(row));

      claimingRows.forEach((row, index) => {
        const previousName = previousNames[index];

        if (previousName !== undefined) {
          renames.set(previousName, this.#rowName(row));
        }

        this.#lastNamesByRow.set(row, this.#rowName(row));
      });
      pendingRows = pendingRows.filter(row => !claimingRows.includes(row));
    }

    return renames;
  }

  #findNameSwap(rows: QuickSetupInventoryItemForm[], pendingRows: QuickSetupInventoryItemForm[]): QuickSetupInventoryItemForm[] {
    for (const firstRow of pendingRows) {
      const swappingRows = [firstRow];
      let owner = this.#recordedOwnerOf(rows, this.#rowName(firstRow));

      while (owner !== undefined && owner !== firstRow && pendingRows.includes(owner) && !swappingRows.includes(owner)) {
        swappingRows.push(owner);
        owner = this.#recordedOwnerOf(rows, this.#rowName(owner));
      }

      if (owner === firstRow) {
        return swappingRows;
      }
    }

    return [];
  }

  #recordedOwnerOf(rows: QuickSetupInventoryItemForm[], name: string): QuickSetupInventoryItemForm | undefined {
    return rows.find(row => this.#lastNamesByRow.get(row) === name);
  }

  #forgetNeededSessionType(removedRow: QuickSetupInventoryItemForm): void {
    const name = this.#lastNamesByRow.get(removedRow);

    if (name === undefined) {
      return;
    }

    for (const row of this.#allSessionTypeRows()) {
      const neededSessionTypes = row.controls.neededSessionTypes.value;

      if (neededSessionTypes.includes(name)) {
        row.controls.neededSessionTypes.setValue(neededSessionTypes.filter(neededSessionType => neededSessionType !== name));
      }
    }
  }

  #rowName(row: QuickSetupInventoryItemForm): string {
    return String(row.controls.name.value ?? '').trim();
  }

  #neededSessionTypeNamesFor(rowGroup: AbstractControl): string[] {
    const row = this.#allSessionTypeRows().find(sessionTypeRow => sessionTypeRow === rowGroup) ?? null;

    return this.#collectNeededSessionTypeNames(row);
  }

  #refreshDependentValidators(): void {
    for (const row of [...this.#allTicketRows(), ...this.addOns.controls]) {
      row.controls.name.updateValueAndValidity({ emitEvent: false });
      row.updateValueAndValidity({ emitEvent: false });
    }

    for (const group of this.groups.controls) {
      group.controls.name.updateValueAndValidity({ emitEvent: false });
      group.updateValueAndValidity({ emitEvent: false });
    }
  }

  #siblingNamesFor(rows: readonly (QuickSetupInventoryItemForm | QuickSetupInventoryGroupForm)[], nameControl: AbstractControl): string[] {
    return rows.filter(row => row.controls.name !== nameControl).map(row => String(row.controls.name.value ?? ''));
  }

  #resetTierPriceFieldState(row: QuickSetupInventoryItemForm): void {
    for (const fieldName of ['valleyPrice', 'normalPrice', 'peakPrice'] as const) {
      const control = row.controls[fieldName];
      control.markAsUntouched();
      control.markAsPristine();
    }
  }

  #refreshPriceValidators(): void {
    const byTier = this.isPricesByTier();
    const optionalTierFieldValidators = byTier ? [Validators.min(0)] : [];
    const flatPriceValidators = byTier ? [] : [Validators.required, Validators.min(0)];
    const sessionTypeRowValidators = [
      ticketsAllowedRangeValidator(),
      neededSessionTypeValidator(control => this.#neededSessionTypeNamesFor(control)),
    ];
    const addOnRowValidators = [neededSessionTypeValidator(control => this.#neededSessionTypeNamesFor(control))];

    this.#allTicketRows().forEach(ticket => {
      ticket.controls.price.setValidators(flatPriceValidators);
      ticket.controls.valleyPrice.setValidators(optionalTierFieldValidators);
      ticket.controls.normalPrice.setValidators(optionalTierFieldValidators);
      ticket.controls.peakPrice.setValidators(optionalTierFieldValidators);
      ticket.setValidators(byTier ? [...sessionTypeRowValidators, tierPricesValidator()] : sessionTypeRowValidators);
      ticket.controls.price.updateValueAndValidity({ emitEvent: false });
      ticket.controls.valleyPrice.updateValueAndValidity({ emitEvent: false });
      ticket.controls.normalPrice.updateValueAndValidity({ emitEvent: false });
      ticket.controls.peakPrice.updateValueAndValidity({ emitEvent: false });
      ticket.updateValueAndValidity({ emitEvent: false });
    });

    this.addOns.controls.forEach(addOn => {
      addOn.controls.price.setValidators(flatPriceValidators);
      addOn.controls.valleyPrice.setValidators(optionalTierFieldValidators);
      addOn.controls.normalPrice.setValidators(optionalTierFieldValidators);
      addOn.controls.peakPrice.setValidators(optionalTierFieldValidators);
      addOn.setValidators(byTier ? [...addOnRowValidators, tierPricesValidator()] : addOnRowValidators);
      addOn.controls.price.updateValueAndValidity({ emitEvent: false });
      addOn.controls.valleyPrice.updateValueAndValidity({ emitEvent: false });
      addOn.controls.normalPrice.updateValueAndValidity({ emitEvent: false });
      addOn.controls.peakPrice.updateValueAndValidity({ emitEvent: false });
      addOn.updateValueAndValidity({ emitEvent: false });
    });

    this.form.updateValueAndValidity();
  }
}
