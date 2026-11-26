import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  EnvironmentInjector,
  inject,
  input,
  OnInit,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { FilterDateRange } from '@fz-original/app/shared/layout/filters/date-range/date-range.interface';
import { FilterDateRangeModule } from '@fz-original/app/shared/layout/filters/date-range/date-range.module';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Channel } from '@fz-original/app/shared/models/channel/channel.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { ChannelTranslatePipe } from '@fz-original/app/shared/pipes/channel-translate/channel-translate.pipe';
import { ChannelsService } from '@fz-original/app/shared/services/channel/channels.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { IgntDialogModule, IgntDialogService, type IgntDialogRef } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, of, Subject, throwError } from 'rxjs';
import { debounceTime, switchMap, take } from 'rxjs/operators';

import { OrderFiltersPanelState } from './order-filters-panel.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FilterDateRangeModule,
    FormsModule,
    IgntButtonComponent,
    IgntDialogModule,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntTypeaheadModule,
    TranslateModule,
  ],
  providers: [TitleCasePipe, ChannelTranslatePipe],
  selector: 'app-order-filters-panel',
  standalone: true,
  styleUrl: './order-filters-panel.component.scss',
  templateUrl: './order-filters-panel.component.html',
})
export class OrderFiltersPanelComponent implements OnInit {
  static readonly cardDigitsRegex = /^\d{4}$/;
  static readonly inputDebounceMs = 300;
  static readonly maxCardDigitsLength = 4;
  static readonly maxDateRangeDays = 31;
  static readonly maxFullNameLength = 200;
  static readonly maxOrderIdLength = 16;
  static readonly maxSeatLabelSearchLength = 500;
  static readonly maxTicketTypeSearchLength = 500;
  static readonly orderIdRegex = /^[0-9]{3,16}$/;

  readonly #channelTranslatePipe = inject(ChannelTranslatePipe);
  readonly #channelsService = inject(ChannelsService);
  readonly #channelsByType = signal<Array<Channel>>([]);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #environmentInjector = inject(EnvironmentInjector);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly filtersPanelTemplate = viewChild.required<TemplateRef<unknown>>('filtersPanelTemplate');
  #filtersDialogRef: IgntDialogRef<void> | null = null;
  #filtersPanelOpenGeneration = 0;
  readonly #orderIdSubject$ = new Subject<number | null>();
  readonly #partnerService = inject(PartnerService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  readonly hiddenChannel = input(false);
  readonly loading = input(false);
  readonly showSeats = input(false);

  readonly maxFullNameLength = OrderFiltersPanelComponent.maxFullNameLength;
  readonly maxSeatLabelSearchLength = OrderFiltersPanelComponent.maxSeatLabelSearchLength;
  readonly maxTicketTypeSearchLength = OrderFiltersPanelComponent.maxTicketTypeSearchLength;
  readonly maxCardDigitsLength = OrderFiltersPanelComponent.maxCardDigitsLength;
  readonly maxOrderIdLength = OrderFiltersPanelComponent.maxOrderIdLength;
  readonly maxDateRange = OrderFiltersPanelComponent.maxDateRangeDays;
  readonly isOrderSearchByCardLast4DigitsEnabled: boolean;

  readonly channelOptions = signal<Array<SelectOption>>([]);
  readonly channelNameOptions = computed(() => [...this.channelOptions()]);
  readonly channelTypeOptions = signal<Array<SelectOption>>([]);
  readonly disableFilters = signal(false);
  readonly filtersReady = signal(false);
  readonly orderIdInput = signal('');
  readonly paymentCardDigitsInvalid = signal(false);
  readonly selectedFilters = signal<OrderFiltersPanelState>({});
  readonly showFilters = signal(false);
  readonly sliderChannelOption = signal<SelectOption | null>(null);
  readonly sliderChannelTypeOption = signal<SelectOption | null>(null);
  readonly sliderFilters = signal<OrderFiltersPanelState>({});
  readonly sliderPaymentCardNumberLast4DigitsInput = signal('');

  readonly activeFiltersCount = computed(() => this.#countActiveFilters(this.selectedFilters()));
  readonly showChannelNameSelector = computed(() => {
    const channelType = this.sliderChannelTypeOption();
    const channels = this.channelOptions();
    if (!channelType || channels.length === 0) {
      return false;
    }
    return channels.length > 1 || channelType.title !== channels[0].title;
  });

  constructor() {
    this.isOrderSearchByCardLast4DigitsEnabled =
      this.#optimizelyService.isFeatureEnabled(FeatureFlags.ORDER_SEARCH_BY_CARD_LAST_4_DIGITS) ?? false;

    effect(() => {
      if (this.showSeats() === false) {
        untracked(() => this.#dropSeatLabelFromUrl());
      }
    });

    effect(() => {
      if (this.hiddenChannel() || this.showFilters()) {
        return;
      }
      const channelsCount = this.#channelsByType().length;
      if (channelsCount === 0) {
        return;
      }
      const { channel, channelType } = this.selectedFilters();
      untracked(() => this.#syncChannelSliderState(channel ?? null, channelType ?? null));
    });
  }

  ngOnInit(): void {
    this.#setupOrderIdDebounce();

    this.#route.queryParams.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params: Params) => {
      this.#initializeFromParams(params, this.hiddenChannel() === false ? this.#channelsByType().length > 0 : false);
    });

    if (this.hiddenChannel() === false) {
      this.#channelsService
        .getChannels(this.#partnerService.getPartner()?.id ?? 0)
        .pipe(
          switchMap((response: BaseResponse<Channel[] | null>) => this.#checkResponseData(response)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (response: BaseResponse<Channel[] | null>) => {
            this.channelTypeOptions.set(this.#getChannelTypes(Object.values(response.data ?? [])));
            this.#channelsByType.set(Object.values(response.data ?? []));
            this.#initializeFromParams(this.#route.snapshot.queryParams, true);
          },
          error: () => {
            this.channelTypeOptions.set([]);
            this.#channelsByType.set([]);
            this.#initializeFromParams(this.#route.snapshot.queryParams, false);
          },
        });
    }
  }

  applyFilters(): void {
    if (!this.#syncPaymentCardDigitsFromInputToSlider()) {
      return;
    }
    const normalizedSliderFilters = this.#normalizeSliderFiltersForApply(this.sliderFilters());
    this.sliderFilters.set(normalizedSliderFilters);
    this.selectedFilters.set({ ...normalizedSliderFilters });
    this.#changeSearchParams(this.selectedFilters());
    this.#closeFiltersPanel();
  }

  changeFullName(fullName: string | null | undefined): void {
    const value = fullName ?? '';
    this.sliderFilters.update(filters => ({ ...filters, fullName: value.length > 0 ? value : null }));
  }

  changeOrderId(orderId: unknown): void {
    const orderIdString = this.#sanitizeDigitsInput(orderId, OrderFiltersPanelComponent.maxOrderIdLength);
    this.orderIdInput.set(orderIdString);
    if (!this.#filterOrderId(orderIdString)) {
      return;
    }
    const orderIdValue = orderIdString.length > 0 ? Number(orderIdString) : null;
    if (orderIdValue === null) {
      this.#orderIdSubject$.next(null);
      this.#syncOrderIdToSearch(null);
      return;
    }
    this.#orderIdSubject$.next(orderIdValue);
  }

  allowOnlyDigits(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      return;
    }
    const key = event.key;
    if (!key) {
      return;
    }
    if (key === 'Dead' || (key.length === 1 && /\D/.test(key))) {
      event.preventDefault();
    }
  }

  onOrderIdInput(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    const sanitized = this.#sanitizeDigitsInput(event.target.value, OrderFiltersPanelComponent.maxOrderIdLength);
    if (event.target.value !== sanitized) {
      event.target.value = sanitized;
    }
    if (this.orderIdInput() !== sanitized) {
      this.changeOrderId(sanitized);
    }
  }

  onOrderIdPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    const currentValue = this.orderIdInput();
    if (input === null) {
      this.changeOrderId(`${currentValue}${pasted}`);
      return;
    }
    const start = input.selectionStart ?? currentValue.length;
    const end = input.selectionEnd ?? currentValue.length;
    this.changeOrderId(`${currentValue.slice(0, start)}${pasted}${currentValue.slice(end)}`);
  }

  changePaymentCardNumberLast4Digits(value: string | null | undefined): void {
    if (!this.isOrderSearchByCardLast4DigitsEnabled) {
      return;
    }
    this.sliderPaymentCardNumberLast4DigitsInput.set((value ?? '').trim());
    this.paymentCardDigitsInvalid.set(false);
  }

  changeSeatLabelSearch(value: string | null | undefined): void {
    const seatLabel = value ?? '';
    this.sliderFilters.update(filters => ({ ...filters, seatLabelSearch: seatLabel.length > 0 ? seatLabel : null }));
  }

  changeTicketTypeSearch(value: string | null | undefined): void {
    const ticketType = value ?? '';
    this.sliderFilters.update(filters => ({ ...filters, ticketTypeSearch: ticketType.length > 0 ? ticketType : null }));
  }

  clearOrderId(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.disableFilters()) {
      return;
    }
    this.orderIdInput.set('');
    this.#orderIdSubject$.next(null);
    this.#syncOrderIdToSearch(null);
  }

  clearFilters(): void {
    this.sliderFilters.update(filters => ({
      ...filters,
      channel: null,
      channelType: null,
      eventDateRange: null,
      fullName: null,
      paymentCardNumberLast4Digits: null,
      purchaseDateRange: null,
      seatLabelSearch: null,
      ticketTypeSearch: null,
    }));
    this.sliderPaymentCardNumberLast4DigitsInput.set('');
    this.paymentCardDigitsInvalid.set(false);
    this.#syncChannelSliderState(null, null);
    this.applyFilters();
  }

  closeFilters(): void {
    this.#closeFiltersPanel();
  }

  openFilters(): void {
    if (this.disableFilters()) {
      return;
    }
    this.#resetSliderState();
    this.#filtersPanelOpenGeneration += 1;
    const openGeneration = this.#filtersPanelOpenGeneration;
    this.#filtersDialogRef?.close();
    this.#filtersDialogRef = this.#dialogService.openSidePanel(this.filtersPanelTemplate(), {
      injector: this.#environmentInjector,
    });
    this.showFilters.set(true);
    const openedRef = this.#filtersDialogRef;
    openedRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      if (openGeneration !== this.#filtersPanelOpenGeneration) {
        return;
      }
      if (this.#filtersDialogRef !== openedRef) {
        return;
      }
      this.#filtersDialogRef = null;
      this.showFilters.set(false);
      this.#resetSliderState();
    });
  }

  selectChannel(option: SelectOption | null): void {
    this.sliderChannelOption.set(option ?? null);
    const channelType = this.sliderChannelTypeOption()?.id ?? null;
    this.sliderFilters.update(filters => ({ ...filters, channel: option?.id ?? null, channelType }));
  }

  selectChannelType(option?: SelectOption | null): void {
    this.sliderChannelTypeOption.set(option ?? null);
    this.channelOptions.set(this.#getChannelsForType(option?.id));
    this.sliderChannelOption.set(null);
    this.sliderFilters.update(filters => ({ ...filters, channel: null, channelType: option?.id ?? null }));
  }

  selectEventDateRange(dateRange: FilterDateRange | null): void {
    this.sliderFilters.update(filters => ({ ...filters, eventDateRange: dateRange ?? null }));
  }

  selectPurchaseDateRange(dateRange: FilterDateRange | null): void {
    this.sliderFilters.update(filters => ({ ...filters, purchaseDateRange: dateRange ?? null }));
  }

  #changeSearchParams(filters: OrderFiltersPanelState): void {
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: this.#filtersToQueryParams(filters),
      queryParamsHandling: 'merge',
    });
  }

  #checkResponseData<T>(response: BaseResponse<T | null>): Observable<BaseResponse<T | null>> {
    return response?.data ? of(response) : throwError(() => response);
  }

  #countActiveFilters(filters: OrderFiltersPanelState): number {
    let count = 0;
    if (filters.channel || filters.channelType) count++;
    if (filters.fullName) count++;
    if (filters.paymentCardNumberLast4Digits) count++;
    if (filters.seatLabelSearch) count++;
    if (filters.ticketTypeSearch) count++;
    if (filters.purchaseDateRange && (filters.purchaseDateRange.startDate || filters.purchaseDateRange.endDate)) count++;
    if (filters.eventDateRange && (filters.eventDateRange.startDate || filters.eventDateRange.endDate)) count++;
    return count;
  }

  #dropSeatLabelFromUrl(): void {
    const currentSeatLabel = this.selectedFilters()?.seatLabelSearch;
    if (typeof currentSeatLabel !== 'string' || currentSeatLabel.trim().length === 0) {
      return;
    }
    const nextSelected: OrderFiltersPanelState = { ...this.selectedFilters(), seatLabelSearch: null };
    this.selectedFilters.set(nextSelected);
    this.sliderFilters.update(filters => ({ ...filters, seatLabelSearch: null }));
    this.#changeSearchParams(nextSelected);
  }

  #filterCardDigits(value: string): boolean {
    return OrderFiltersPanelComponent.cardDigitsRegex.test(value);
  }

  #syncPaymentCardDigitsFromInputToSlider(): boolean {
    if (!this.isOrderSearchByCardLast4DigitsEnabled) {
      return true;
    }
    const trimmed = this.sliderPaymentCardNumberLast4DigitsInput().trim();
    if (trimmed.length === 0) {
      this.sliderFilters.update(filters => ({ ...filters, paymentCardNumberLast4Digits: null }));
      return true;
    }
    if (this.#filterCardDigits(trimmed)) {
      this.sliderFilters.update(filters => ({ ...filters, paymentCardNumberLast4Digits: trimmed }));
      return true;
    }
    this.paymentCardDigitsInvalid.set(true);
    return false;
  }

  #filterOrderId(orderIdValue: string): boolean {
    return !orderIdValue ? true : OrderFiltersPanelComponent.orderIdRegex.test(orderIdValue);
  }

  #sanitizeDigitsInput(value: unknown, maxLength: number): string {
    return String(value ?? '')
      .replace(/\D/g, '')
      .slice(0, maxLength);
  }

  #filtersToQueryParams(filters: OrderFiltersPanelState): Params {
    const { purchaseDateRange, eventDateRange, ...rest } = filters;
    const params: Params = {
      ...rest,
      ...this.#parseDateRange(purchaseDateRange || {}, 'purchaseStartDate', 'purchaseEndDate'),
      ...this.#parseDateRange(eventDateRange || {}, 'eventStartDate', 'eventEndDate'),
    };
    if (!this.isOrderSearchByCardLast4DigitsEnabled) {
      params['paymentCardNumberLast4Digits'] = null;
    }
    return params;
  }

  #findChannelTypeIdByChannelId(channelId: string | null | undefined): string | null {
    if (!channelId) return null;
    return this.#channelsByType().find(channel => channel.id === channelId)?.type ?? null;
  }

  #getChannelTypes(values: Array<Channel>): Array<SelectOption> {
    const allChannelTypes = values.map(value => ({
      id: value.type ?? '',
      title: this.#channelTranslatePipe.transformType(value.type ?? ''),
    }));
    const uniqueIds = new Set(allChannelTypes.map(item => item.id));
    return [...uniqueIds]
      .map(id => allChannelTypes.find(item => item.id === id))
      .filter((item): item is SelectOption => item !== undefined);
  }

  #getChannels(values: Array<Channel>): Array<SelectOption> {
    return values.map(value => ({
      id: value.id,
      title: this.#channelTranslatePipe.transform(value.id, value.name ?? ''),
    }));
  }

  #getChannelsForType(typeId?: string | null): Array<SelectOption> {
    if (!typeId) return [];
    const channelsForType = this.#channelsByType().filter(channel => channel.type === typeId && channel.type);
    return this.#getChannels(channelsForType);
  }

  #getDateRangeFromParams(startDate: string | undefined, endDate: string | undefined): FilterDateRange | null {
    return startDate || endDate
      ? {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        }
      : null;
  }

  #getFiltersFromParams(params: Params): OrderFiltersPanelState {
    const {
      orderId,
      channel,
      channelType,
      purchaseStartDate,
      fullName,
      purchaseEndDate,
      eventStartDate,
      eventEndDate,
      seatLabelSearch,
      ticketTypeSearch,
      paymentCardNumberLast4Digits,
    } = params;

    const purchaseDateRange = this.#getDateRangeFromParams(purchaseStartDate, purchaseEndDate);
    const eventDateRange = this.#getDateRangeFromParams(eventStartDate, eventEndDate);

    const normalizedFullName = typeof fullName === 'string' ? this.#normalizeFullNameFromParams(fullName) : fullName;
    const normalizedSeatLabelSearch =
      typeof seatLabelSearch === 'string'
        ? this.#normalizeKeywordSearchFromParams(seatLabelSearch, OrderFiltersPanelComponent.maxSeatLabelSearchLength)
        : seatLabelSearch;
    const normalizedTicketTypeSearch =
      typeof ticketTypeSearch === 'string'
        ? this.#normalizeKeywordSearchFromParams(ticketTypeSearch, OrderFiltersPanelComponent.maxTicketTypeSearchLength)
        : ticketTypeSearch;
    const normalizedCardDigits =
      this.isOrderSearchByCardLast4DigitsEnabled && typeof paymentCardNumberLast4Digits === 'string'
        ? this.#normalizeCardDigitsFromParams(paymentCardNumberLast4Digits)
        : undefined;

    return {
      channel,
      channelType,
      eventDateRange,
      fullName: normalizedFullName,
      orderId: this.#normalizeOrderIdFromParams(orderId),
      paymentCardNumberLast4Digits: normalizedCardDigits,
      purchaseDateRange,
      seatLabelSearch: normalizedSeatLabelSearch,
      ticketTypeSearch: normalizedTicketTypeSearch,
    };
  }

  #initializeFromParams(params: Params, channelsLoaded: boolean): void {
    const nextSelectedFilters = this.#getFiltersFromParams(params);
    const panelOpen = this.showFilters();

    this.selectedFilters.set(nextSelectedFilters);
    const urlOrderIdString =
      nextSelectedFilters.orderId !== null && nextSelectedFilters.orderId !== undefined ? String(nextSelectedFilters.orderId) : '';
    const preserveDraftWhileLoading = this.loading() && this.orderIdInput() !== urlOrderIdString;
    if (!preserveDraftWhileLoading) {
      this.orderIdInput.set(urlOrderIdString);
    }

    if (!panelOpen) {
      this.sliderFilters.set({ ...nextSelectedFilters });
      this.sliderPaymentCardNumberLast4DigitsInput.set(params.paymentCardNumberLast4Digits ?? '');
      if (channelsLoaded) {
        this.#syncChannelSliderState(nextSelectedFilters.channel, nextSelectedFilters.channelType);
      }
    }

    const { cityId } = params;
    if (!cityId) {
      const emptyRange: FilterDateRange = { startDate: null, endDate: null };
      let nextSelected: OrderFiltersPanelState = {
        ...nextSelectedFilters,
        purchaseDateRange: emptyRange,
        eventDateRange: emptyRange,
      };
      if (channelsLoaded) {
        nextSelected = { ...nextSelected, channel: null, channelType: null };
        this.#syncChannelSliderState(null, null);
      }
      this.selectedFilters.set(nextSelected);
      this.sliderFilters.update(filters => ({ ...filters, ...nextSelected }));
      this.disableFilters.set(true);
    } else {
      this.disableFilters.set(false);
    }
    this.filtersReady.set(true);
  }

  #normalizeSliderFiltersForApply(filters: OrderFiltersPanelState): OrderFiltersPanelState {
    return {
      ...filters,
      fullName:
        typeof filters.fullName === 'string' ? (this.#normalizeFullNameFromParams(filters.fullName) ?? null) : (filters.fullName ?? null),
      seatLabelSearch:
        typeof filters.seatLabelSearch === 'string'
          ? (this.#normalizeKeywordSearchFromParams(filters.seatLabelSearch, OrderFiltersPanelComponent.maxSeatLabelSearchLength) ?? null)
          : (filters.seatLabelSearch ?? null),
      ticketTypeSearch:
        typeof filters.ticketTypeSearch === 'string'
          ? (this.#normalizeKeywordSearchFromParams(filters.ticketTypeSearch, OrderFiltersPanelComponent.maxTicketTypeSearchLength) ?? null)
          : (filters.ticketTypeSearch ?? null),
    };
  }

  #normalizeCardDigitsFromParams(value: string): string | undefined {
    const trimmed = value?.trim() ?? '';
    if (trimmed.length === 0) return undefined;
    if (!this.#filterCardDigits(trimmed)) return undefined;
    return trimmed;
  }

  #normalizeOrderIdFromParams(value: unknown): number | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    const orderIdString = String(value ?? '').trim();
    if (orderIdString.length === 0) {
      return null;
    }
    return this.#filterOrderId(orderIdString) ? Number(orderIdString) : null;
  }

  #normalizeFullNameFromParams(value: string): string | undefined {
    const trimmed = value?.trim() ?? '';
    if (trimmed.length === 0) return undefined;
    return trimmed.slice(0, OrderFiltersPanelComponent.maxFullNameLength) || undefined;
  }

  #normalizeKeywordSearchFromParams(value: string, maxLength: number): string | undefined {
    const trimmed = value?.trim() ?? '';
    if (trimmed.length === 0) return undefined;
    return trimmed.slice(0, maxLength) || undefined;
  }

  #parseDate(date: Date): string {
    return date.toISOString().split('T').shift() ?? '';
  }

  #parseDateRange({ startDate, endDate }: Partial<FilterDateRange>, startKey: string, endKey: string): Record<string, string | null> {
    const start: string | undefined = startDate ? this.#parseDate(startDate) : undefined;
    const end: string | undefined = endDate ? this.#parseDate(endDate) : undefined;
    return {
      [startKey]: start ?? null,
      [endKey]: end ?? null,
    };
  }

  #closeFiltersPanel(): void {
    this.#filtersDialogRef?.close();
  }

  #resetSliderState(): void {
    const currentSelectedFilters = this.selectedFilters();
    this.sliderFilters.set({ ...currentSelectedFilters });
    this.#syncChannelSliderState(currentSelectedFilters.channel, currentSelectedFilters.channelType);
    this.sliderPaymentCardNumberLast4DigitsInput.set(currentSelectedFilters.paymentCardNumberLast4Digits ?? '');
    this.paymentCardDigitsInvalid.set(false);
  }

  #syncChannelSliderState(channelId: string | null | undefined, channelTypeIdFromFilters: string | null | undefined): void {
    const channelTypeId = this.#findChannelTypeIdByChannelId(channelId) ?? channelTypeIdFromFilters ?? null;
    if (!channelTypeId) {
      this.sliderChannelTypeOption.set(null);
      this.sliderChannelOption.set(null);
      this.channelOptions.set([]);
      return;
    }

    const channelTypeOption = this.channelTypeOptions().find(option => option.id === channelTypeId) ?? null;
    const nextChannelOptions = this.#getChannelsForType(channelTypeId);
    const channelOption = nextChannelOptions.find(option => option.id === channelId) ?? null;

    this.sliderChannelTypeOption.set(channelTypeOption);
    this.channelOptions.set(nextChannelOptions);
    this.sliderChannelOption.set(channelOption);
  }

  #syncOrderIdToSearch(orderId: number | null): void {
    this.selectedFilters.update(filters => ({ ...filters, orderId }));
    if (this.showFilters()) {
      this.sliderFilters.update(filters => ({ ...filters, orderId }));
    }
    this.#changeSearchParams({ ...this.selectedFilters(), orderId });
  }

  #setupOrderIdDebounce(): void {
    this.#orderIdSubject$
      .pipe(debounceTime(OrderFiltersPanelComponent.inputDebounceMs), takeUntilDestroyed(this.#destroyRef))
      .subscribe(orderId => {
        const appliedOrderId = this.selectedFilters().orderId ?? null;
        if (appliedOrderId === orderId) {
          return;
        }
        this.#syncOrderIdToSearch(orderId);
      });
  }
}
