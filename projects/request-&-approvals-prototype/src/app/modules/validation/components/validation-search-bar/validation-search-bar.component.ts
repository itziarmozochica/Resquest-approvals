import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { ScannerService } from '@fz-original/app/app/services/scanner/scanner.service';
import { RecentSearch } from '@fz-original/app/shared/components/recent-searches-dropdown/recent-search.model';
import { RecentSearchesDropdownComponent } from '@fz-original/app/shared/components/recent-searches-dropdown/recent-searches-dropdown.component';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { phoneValidator } from '@fz-original/app/shared/validators/phone.validator';
import { IgntDialogService } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { merge, Subject } from 'rxjs';
import { take } from 'rxjs/operators';

import { SelectOption } from '../../../../shared/layout/filters/select/select.interface';
import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../shared/optimizely/optimizely.service';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { BusinessValidationOptionTypeahead, ValidationOptionTypeahead } from '../../enums/validation-option-typeahead.enum';
import { ValidationTypeEnum } from '../../enums/validation-type.enum';
import { ValidationSearchOptionRequest, ValidationSearchType } from '../../models/validation-search.model';
import { ValidationRecentSearchesService } from '../../services/recent-searches/validation-recent-searches.service';
import { SelectedValidationService } from '../../services/selected-validation/selected-validation.service';
import { ScannerComponent } from '../scanner/scanner.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IgntIconButtonComponent,
    IgntInputFieldComponent,
    IgntTypeaheadModule,
    RecentSearchesDropdownComponent,
    TranslateModule,
  ],
  providers: [ValidationRecentSearchesService],
  selector: 'app-validation-search-bar',
  styleUrl: './validation-search-bar.component.scss',
  templateUrl: './validation-search-bar.component.html',
})
export class ValidationSearchBarComponent implements OnInit {
  static readonly placeholderPrefix = 'validateTickets.';

  #allRecentSearches: RecentSearch[] = [];
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #forceSearch$ = new Subject<Params>();
  #isHardwareScannedCode = false;
  #isScannedCode = false;
  #scanOrigin: string | undefined;
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #isValidationSearchByCardLast4DigitsEnabled =
    this.#optimizelyService.isFeatureEnabled(FeatureFlags.ORDER_SEARCH_BY_CARD_LAST_4_DIGITS) ?? false;
  readonly #partnerId: number | null = inject(PartnerService).getPartner()?.id ?? null;
  readonly #recentSearchesService = inject(ValidationRecentSearchesService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #scannerService = inject(ScannerService);
  readonly #selectedValidationService = inject(SelectedValidationService);
  readonly #translateService = inject(TranslateService);
  readonly #validationOptionTypeahead: typeof ValidationOptionTypeahead & typeof BusinessValidationOptionTypeahead = {
    ...ValidationOptionTypeahead,
    ...BusinessValidationOptionTypeahead,
  };

  readonly optionSelected = output<SelectOption>();
  readonly searchRequested = output<ValidationSearchOptionRequest>();

  readonly recentSearchesDropdown = viewChild(RecentSearchesDropdownComponent);
  readonly searchContainer = viewChild.required<ElementRef<HTMLElement>>('searchContainer');

  readonly searchForm = new FormGroup({
    searchField: new FormControl<string | number | null>('', [Validators.required, Validators.minLength(8)]),
  });
  readonly validationOptions: SelectOption[] = this.#generateSearchOptions();
  readonly initialValidationOption: SelectOption = this.validationOptions[0];

  protected readonly clearIcon: [string, string] = ['fas', 'times'];
  protected readonly searchIcon: [string, string] = ['far', 'search'];

  readonly #isInvalid = signal(false);
  readonly isInvalid = this.#isInvalid.asReadonly();
  readonly #isRecentSearchesVisible = signal(false);
  readonly isRecentSearchesVisible = this.#isRecentSearchesVisible.asReadonly();
  readonly #recentSearches = signal<RecentSearch[]>([]);
  readonly recentSearches = this.#recentSearches.asReadonly();
  readonly #selectedOption = signal<SelectOption | undefined>(undefined);
  readonly selectedOption = this.#selectedOption.asReadonly();

  /**
   * The field binds this value, not the validated control: `ignt-input-field` paints any invalid control as an error,
   * and an empty search is invalid before the user types anything. The validators only gate the search.
   */
  protected readonly searchFieldValue = toSignal(this.searchForm.controls.searchField.valueChanges, {
    initialValue: this.searchForm.controls.searchField.value,
  });
  protected readonly recentSearchesQuery = computed(() => String(this.searchFieldValue() ?? ''));
  protected readonly isClosable = computed(() => String(this.searchFieldValue() ?? '').trim().length > 0);
  protected readonly isCodeSelected = computed(() => this.selectedOption()?.id === ValidationOptionTypeahead.code);
  protected readonly isOrderSelected = computed(() => this.selectedOption()?.id === ValidationOptionTypeahead.order);
  protected readonly placeholderKey = computed(() => {
    const option = this.selectedOption();
    const searchType = option === undefined ? undefined : this.#getSearchTypeByTypeahead(option.id);
    return searchType === undefined ? '' : ValidationSearchBarComponent.placeholderPrefix + searchType.inputPlaceholder;
  });

  changeSearchField(value: string): void {
    const isOrderId = this.isOrderSelected() && typeof value === 'string';
    this.searchForm.controls.searchField.setValue(isOrderId ? value.trim().replace(/^R/i, '') : value);
    this.#isInvalid.set(false);
  }

  clearRecentSearches(): void {
    const searchType = this.#selectedSearchType();
    if (this.#partnerId !== null && searchType !== undefined) {
      this.#recentSearchesService.clearRecentSearches(this.#partnerId, searchType.validationOptionEnumValue);
    }
    this.#loadRecentSearches();
    this.#hideRecentSearches();
  }

  clearSearchField(): void {
    this.searchForm.controls.searchField.setValue('');
    this.#isInvalid.set(false);
  }

  filterRecentSearches(): void {
    const query = String(this.searchForm.controls.searchField.value ?? '')
      .trim()
      .toLowerCase();
    const recentSearches =
      query === '' ? this.#allRecentSearches : this.#allRecentSearches.filter(item => item.value.toLowerCase().includes(query));
    this.#recentSearches.set(recentSearches);
    this.#isRecentSearchesVisible.set(!this.isInvalid() && recentSearches.length > 0);
  }

  handleFieldInput(event: Event): void {
    this.filterRecentSearches();
    if (event instanceof InputEvent && event.inputType === 'insertFromPaste') {
      this.submitSearch();
    }
  }

  hideRecentSearchesOnBlur(event: FocusEvent): void {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && this.searchContainer().nativeElement.contains(relatedTarget)) {
      return;
    }
    this.#hideRecentSearches();
  }

  hideRecentSearchesOnKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      this.recentSearchesDropdown()?.focusFirst();
    }
    if (event.key === 'Escape') {
      if (event.target instanceof HTMLInputElement) {
        this.#hideRecentSearches();
        event.target.blur();
      } else {
        this.searchContainer().nativeElement.querySelector('input')?.focus();
        this.#hideRecentSearches();
      }
    }
  }

  ngOnInit(): void {
    /**
     * This subscription needs to be in the ngOnInit.
     */
    this.#observeSearchParamsChanges();
    this.#observeScanCode();
  }

  removeRecentSearch(value: string): void {
    const searchType = this.#selectedSearchType();
    if (this.#partnerId !== null && searchType !== undefined) {
      this.#recentSearchesService.removeRecentSearch(this.#partnerId, searchType.validationOptionEnumValue, value);
    }
    this.showRecentSearches();
  }

  search(): void {
    this.#hideRecentSearches();
    this.#isInvalid.set(false);
    const selectedOption = this.selectedOption();
    if (selectedOption !== undefined) {
      const value = String(this.searchForm.controls.searchField.value ?? '');
      const searchType: ValidationSearchType<string | number | null> | undefined = this.#getSearchTypeByTypeahead(selectedOption.id);
      if (searchType !== undefined) {
        const params: Record<string, string | null> = {
          code: null,
          email: null,
          external_order_id: null,
          id: null,
          payment_card_number_last_4_digits: null,
          phone_number: null,
          type: searchType.validationOptionEnumValue,
          ...searchType.toQueryParam(value),
        };
        this.#changeSearchParams(params);
      }
    }
  }

  selectCamera(): void {
    const dialogRef = this.#dialogService.openModal<string>(ScannerComponent, { size: 'sm' });
    this.searchForm.controls.searchField.setValue('');
    this.search();
    this.#isScannedCode = true;
    dialogRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe({
      error: () => {
        this.#isScannedCode = false;
      },
      next: (value: string | undefined) => {
        if (value) {
          this.searchForm.controls.searchField.setValue(value);
          this.search();
        } else {
          this.#isScannedCode = false;
        }
      },
    });
  }

  selectRecentSearch(value: string): void {
    this.searchForm.controls.searchField.setValue(value);
    this.#hideRecentSearches();
    this.search();
  }

  selectValidationType(option: SelectOption): void {
    this.#hideRecentSearches();
    this.#isInvalid.set(false);
    const searchType: ValidationSearchType<string | number | null> | undefined = this.#getSearchTypeByTypeahead(option.id);
    if (searchType !== undefined) {
      const params: Params = {
        code: null,
        email: null,
        external_order_id: null,
        id: null,
        payment_card_number_last_4_digits: null,
        phone_number: null,
        type: searchType.validationOptionEnumValue,
      };
      this.#changeSearchParams(params);
    }
  }

  showRecentSearches(): void {
    this.#loadRecentSearches();
    this.filterRecentSearches();
  }

  /** Enter and paste in the field search; an invalid value never reaches the URL. */
  submitSearch(): void {
    if (this.searchForm.valid) {
      this.search();
    } else if (String(this.searchForm.controls.searchField.value ?? '').trim() !== '') {
      this.#hideRecentSearches();
      this.#isInvalid.set(true);
    }
  }

  #areEqualToCurrentQueryParams(newQueryParams: Record<string, string | null>): boolean {
    const currentParams: Params = this.#route.snapshot.queryParams;
    return Object.entries(newQueryParams).every(([key, value]) => currentParams[key] === value?.toString());
  }

  #changeSearchParams(newQueryParams: Record<string, string | null>): void {
    if (this.#areEqualToCurrentQueryParams(newQueryParams)) {
      this.#forceSearch$.next(newQueryParams);
    } else {
      if (this.#isScanInProgress()) {
        this.#scanOrigin = this.#router.url;
      }
      this.#router.navigate([], {
        queryParams: newQueryParams,
        queryParamsHandling: 'merge',
        relativeTo: this.#route,
        replaceUrl: true,
      });
    }
  }

  #emitSearch(option: ValidationOptionTypeahead, value: string | number): void {
    const searchType: ValidationSearchType<string | number | null> | undefined = this.#getSearchTypeByTypeahead(option);
    if (searchType !== undefined) {
      if (this.#partnerId !== null) {
        this.#recentSearchesService.addRecentSearch(this.#partnerId, searchType.validationOptionEnumValue, String(value));
      }
      this.#loadRecentSearches();
      this.#isInvalid.set(false);
      this.searchRequested.emit({
        fromCamera: this.#isScannedCode,
        fromScan: this.#isScanInProgress(),
        scanOrigin: this.#scanOrigin,
        type: searchType.validationOptionEnumValue,
        value,
      });
    }
  }

  #generateSearchOptions(): SelectOption[] {
    return Object.keys(this.#validationOptionTypeahead)
      .filter((key: string) => typeof this.#validationOptionTypeahead[key as keyof typeof ValidationOptionTypeahead] === 'number')
      .map(value => ({
        id: this.#validationOptionTypeahead[value as keyof typeof ValidationOptionTypeahead],
        title: this.#translateService.instant('validateTickets.' + value),
      }))
      .filter(option => this.#isValidationSearchByCardLast4DigitsEnabled || option.id !== ValidationOptionTypeahead.card_digits)
      .sort(this.#sortOptionsById);
  }

  #getSearchTypeByTypeahead(
    value: ValidationOptionTypeahead | BusinessValidationOptionTypeahead,
  ): ValidationSearchType<number | string | null> | undefined {
    const searchTypes: ValidationSearchType<number | string | null>[] = [
      {
        inputPlaceholder: 'enterTicketId',
        typeaheadEnumValue: ValidationOptionTypeahead.ticket,
        validationOptionEnumValue: ValidationTypeEnum.TICKET,
        validators: [Validators.required, Validators.pattern('\\d+'), Validators.maxLength(11)],
        fromQueryParam: (params: Params) => this.#parseIfIntOrNull(params['id']),
        toQueryParam: (value: string) => ({ id: this.#parseIfIntOrNull(value) }),
      },
      {
        inputPlaceholder: 'enterOrderId',
        typeaheadEnumValue: ValidationOptionTypeahead.order,
        validationOptionEnumValue: ValidationTypeEnum.ORDER,
        validators: [Validators.required, Validators.pattern('\\d+'), Validators.maxLength(11)],
        fromQueryParam: (params: Params) => this.#parseIfIntOrNull(params['id']),
        toQueryParam: (value: string) => ({ id: this.#parseIfIntOrNull(value) }),
      },
      {
        inputPlaceholder: 'enterEmail',
        typeaheadEnumValue: ValidationOptionTypeahead.email,
        validationOptionEnumValue: ValidationTypeEnum.EMAIL,
        validators: [Validators.required, Validators.email],
        fromQueryParam: (params: Params) => params['email'],
        toQueryParam: (value: string) => ({ email: value }),
      },
      {
        inputPlaceholder: 'enterCode',
        typeaheadEnumValue: ValidationOptionTypeahead.code,
        validationOptionEnumValue: ValidationTypeEnum.CODE,
        validators: [Validators.required, Validators.minLength(8)],
        fromQueryParam: (params: Params) => params['code'],
        toQueryParam: (value: string) => ({ code: value }),
      },
      {
        inputPlaceholder: 'enterReservationId',
        typeaheadEnumValue: BusinessValidationOptionTypeahead.reservation,
        validationOptionEnumValue: ValidationTypeEnum.RESERVATION,
        validators: [Validators.required, Validators.minLength(9)],
        fromQueryParam: (params: Params) => params['id'],
        toQueryParam: (value: string) => ({ id: value }),
      },
      {
        inputPlaceholder: 'enterPhone',
        typeaheadEnumValue: ValidationOptionTypeahead.phone,
        validationOptionEnumValue: ValidationTypeEnum.PHONE,
        validators: [Validators.required, phoneValidator()],
        fromQueryParam: (params: Params) => params['phone_number']?.replace(/%2B/g, '+'),
        toQueryParam: (value: string) => ({
          phone_number: value.replace(/[\s\-()]/g, '').replace(/\+/g, '%2B'),
        }),
      },
      {
        inputPlaceholder: 'enterCardDigits',
        typeaheadEnumValue: ValidationOptionTypeahead.card_digits,
        validationOptionEnumValue: ValidationTypeEnum.CARD_DIGITS,
        validators: [Validators.required, Validators.pattern('\\d{4}')],
        fromQueryParam: (params: Params) => params['payment_card_number_last_4_digits'],
        toQueryParam: (value: string) => ({ payment_card_number_last_4_digits: value }),
      },
      {
        inputPlaceholder: 'enterExternalOrderId',
        typeaheadEnumValue: ValidationOptionTypeahead.external_order,
        validationOptionEnumValue: ValidationTypeEnum.EXTERNAL_ORDER,
        validators: [Validators.required, Validators.pattern('.*\\S.*'), Validators.maxLength(255)],
        fromQueryParam: (params: Params) => params['external_order_id'],
        toQueryParam: (value: string) => ({ external_order_id: value.trim() }),
      },
    ];

    return searchTypes.find(type => type.typeaheadEnumValue === value);
  }

  #hideRecentSearches(): void {
    this.#isRecentSearchesVisible.set(false);
  }

  #isScanInProgress(): boolean {
    return this.#isScannedCode || this.#isHardwareScannedCode;
  }

  #loadRecentSearches(): void {
    const searchType = this.#selectedSearchType();
    if (this.#partnerId === null || searchType === undefined) {
      this.#allRecentSearches = [];
      this.#recentSearches.set([]);
      return;
    }
    this.#allRecentSearches = this.#recentSearchesService.getRecentSearchEntries(this.#partnerId, searchType.validationOptionEnumValue);
  }

  #observeScanCode(): void {
    this.#scannerService
      .observeScanCode()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((code: string) => {
        const validationOption: SelectOption | undefined = this.validationOptions.find(
          (option: SelectOption) => option.id === ValidationOptionTypeahead.code,
        );
        if (validationOption === undefined) {
          return;
        }
        const searchType: ValidationSearchType<string | number | null> | undefined = this.#getSearchTypeByTypeahead(validationOption.id);
        if (searchType !== undefined) {
          const params: Params = {
            code: code,
            email: null,
            external_order_id: null,
            id: null,
            payment_card_number_last_4_digits: null,
            phone_number: null,
            type: searchType.validationOptionEnumValue,
          };
          this.#isHardwareScannedCode = true;
          this.#changeSearchParams(params);
        }
      });
  }

  #observeSearchParamsChanges(): void {
    merge(this.#route.queryParams, this.#forceSearch$)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((params: Params) => {
        const validationOptionId: string | ValidationOptionTypeahead =
          this.#validationOptionTypeahead[params['type']] ?? this.#selectedValidationService.getValidationOption(this.#partnerId);
        const newSelectedOption: SelectOption =
          this.validationOptions.find(option => option.id === validationOptionId) ?? this.initialValidationOption;
        if (newSelectedOption.id !== this.selectedOption()?.id) {
          this.#selectedOption.set(newSelectedOption);
          this.#updateValidationType(newSelectedOption);
        }
        const selectedOption = this.selectedOption() ?? newSelectedOption;
        const searchType: ValidationSearchType<string | number | null> | undefined = this.#getSearchTypeByTypeahead(selectedOption.id);
        if (searchType !== undefined) {
          const value = searchType.fromQueryParam(params);
          this.searchForm.controls.searchField.setValue(value);
          if (value) {
            if (this.searchForm.valid) {
              this.#emitSearch(selectedOption.id, value);
            }
            this.#isScannedCode = false;
            this.#isHardwareScannedCode = false;
            this.#scanOrigin = undefined;
          }
        }
      });
  }

  #parseIfIntOrNull(value: string): number | null {
    const parsedValue = parseInt(value);
    return isNaN(parsedValue) ? null : parsedValue;
  }

  #selectedSearchType(): ValidationSearchType<string | number | null> | undefined {
    const selectedOption = this.selectedOption();
    return selectedOption === undefined ? undefined : this.#getSearchTypeByTypeahead(selectedOption.id);
  }

  #sortOptionsById(option_a: SelectOption, option_b: SelectOption): number {
    return option_a.id - option_b.id;
  }

  #updateValidationType(selectedOption: SelectOption): void {
    this.optionSelected.emit(selectedOption);
    const control: AbstractControl<string | number | null> = this.searchForm.controls.searchField;
    control.clearValidators();
    control.setValue('');
    const searchType: ValidationSearchType<string | number | null> | undefined = this.#getSearchTypeByTypeahead(selectedOption.id);
    if (searchType !== undefined) {
      control.addValidators(searchType.validators);
    }
    control.updateValueAndValidity();
    if (this.#partnerId !== null) {
      this.#selectedValidationService.setValidationOption(this.#partnerId, selectedOption.id);
    }
    this.#loadRecentSearches();
  }
}
