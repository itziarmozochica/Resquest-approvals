import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { PaymentConfigStorageService } from '@fz-original/app/modules/box-office/shared/services/payment/payment-config-storage.service';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IngtFormError } from '@ignite/legacy/models/ignt-input.model';
import { TranslateModule } from '@ngx-translate/core';
import { CountryCode } from 'libphonenumber-js';
import { map } from 'rxjs';

import { TelTypePhoneService } from '../../booking-questions/modules/form-group/tel-type/tel-type-phone.service';
import { InputMobileBehaviorModule } from '../../directives/input-mobile-behavior/input-mobile-behavior.module';
import { PhoneFieldCountryOption, PhoneFieldState } from './contact-phone-field.model';
import {
  changePhoneCountry,
  emptyPhoneFieldState,
  filterCountryOptions,
  readPhoneInput,
  toCountryCode,
  toCountryOptions,
  toExampleNationalNumber,
  toPhoneFieldState,
  toPrefixLabel,
} from './contact-phone-field.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    IgntInputFieldComponent,
    InputMobileBehaviorModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ContactPhoneFieldComponent),
    },
    TelTypePhoneService,
  ],
  selector: 'app-contact-phone-field',
  styleUrl: './contact-phone-field.component.scss',
  templateUrl: './contact-phone-field.component.html',
})
export class ContactPhoneFieldComponent implements ControlValueAccessor {
  static readonly ALLOWED_KEY = /[\d+()\-\s]/;
  static readonly COUNTRY_PANEL_BELOW: ConnectedPosition = { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' };
  static readonly COUNTRY_PANEL_ABOVE: ConnectedPosition = { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' };
  static readonly COUNTRY_PANEL_POSITIONS: ConnectedPosition[] = [
    ContactPhoneFieldComponent.COUNTRY_PANEL_BELOW,
    ContactPhoneFieldComponent.COUNTRY_PANEL_ABOVE,
  ];
  static readonly MOBILE_POS_COUNTRY_PANEL_POSITIONS: ConnectedPosition[] = [
    ContactPhoneFieldComponent.COUNTRY_PANEL_ABOVE,
    ContactPhoneFieldComponent.COUNTRY_PANEL_BELOW,
  ];

  readonly #paymentConfigStorageService = inject(PaymentConfigStorageService);
  readonly #phoneService = inject(TelTypePhoneService);
  #countryListRevealFrameId: number | null = null;
  #countryListRevealTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly defaultCountry = input<string | null>(null);
  readonly error = input<IngtFormError | null>(null);
  readonly id = input('');
  readonly isMandatory = input(false);

  readonly prefixControl = new FormControl('', { nonNullable: true });

  readonly countryOptionElements = viewChildren('countryOption', { read: ElementRef });
  readonly phoneInput = viewChild('phoneInput', { read: IgntInputFieldComponent });
  readonly prefixInput = viewChild('prefixInput', { read: IgntInputFieldComponent });

  readonly #defaultCountryCode = computed(() => toCountryCode(this.defaultCountry()));
  readonly #isDisabled = signal(false);
  readonly #query = signal<string | null>(null);
  readonly #state = linkedSignal<CountryCode | null, PhoneFieldState>({
    source: this.#defaultCountryCode,
    computation: (defaultCountry, previous) =>
      previous === undefined || (previous.value.value === '' && previous.value.country === null)
        ? emptyPhoneFieldState(defaultCountry)
        : previous.value,
  });

  #lastReportedValue = '';
  #onChange: (value: string) => void = () => {};
  #onTouched: () => void = () => {};

  readonly countryOptions = toSignal(this.#phoneService.countryCodes().pipe(map(toCountryOptions)), { initialValue: [] });
  readonly countryPanelPositions = this.#paymentConfigStorageService.isMobilePos()
    ? ContactPhoneFieldComponent.MOBILE_POS_COUNTRY_PANEL_POSITIONS
    : ContactPhoneFieldComponent.COUNTRY_PANEL_POSITIONS;
  readonly country = computed(() => this.#state().country);
  readonly filteredCountryOptions = computed(() => filterCountryOptions(this.countryOptions(), this.#query() ?? ''));
  readonly isCountryPanelOpen = computed(() => this.#query() !== null);
  readonly #isCountryListReady = linkedSignal({ source: this.isCountryPanelOpen, computation: () => false });
  readonly isCountryListReady = this.#isCountryListReady.asReadonly();
  readonly isDisabled = this.#isDisabled.asReadonly();
  readonly listboxId = computed(() => `${this.id() || 'contact-phone'}-countries`);
  readonly nationalNumber = computed(() => this.#state().nationalNumber);
  readonly phoneErrors = computed<IngtFormError[]>(() => {
    const error = this.error();
    return error === null ? [] : [error];
  });
  readonly phonePlaceholder = computed(() => toExampleNationalNumber(this.country()));
  readonly prefixInputId = computed(() => `${this.id() || 'contact-phone'}-prefix`);
  readonly selectedCountryOption = computed(() => this.countryOptions().find(option => option.country === this.country()) ?? null);
  readonly prefixLabel = computed(() => toPrefixLabel(this.selectedCountryOption()));
  readonly prefixValue = computed(() => this.#query() ?? this.prefixLabel());
  readonly #activeIndex = linkedSignal(() =>
    Math.max(
      0,
      this.filteredCountryOptions().findIndex(option => option.country === this.country()),
    ),
  );
  readonly activeIndex = this.#activeIndex.asReadonly();
  readonly activeOptionId = computed(() => {
    const option = this.filteredCountryOptions()[this.#activeIndex()];
    return this.isCountryPanelOpen() && option !== undefined ? `${this.listboxId()}-${option.country}` : null;
  });

  constructor() {
    effect(() => this.prefixControl.setValue(this.prefixValue(), { emitEvent: false }));

    inject(DestroyRef).onDestroy(() => this.#cancelCountryListReveal());

    afterRenderEffect(() => {
      const prefixElement: HTMLInputElement | undefined = this.prefixInput()?.inputElement?.nativeElement;
      if (prefixElement === undefined) {
        return;
      }
      prefixElement.setAttribute('role', 'combobox');
      prefixElement.setAttribute('aria-autocomplete', 'list');
      prefixElement.setAttribute('aria-controls', this.listboxId());
      prefixElement.setAttribute('aria-expanded', String(this.isCountryPanelOpen()));
      this.#setOptionalAttribute(prefixElement, 'aria-activedescendant', this.activeOptionId());
    });

    afterRenderEffect(() => {
      const activeOption: unknown = this.countryOptionElements()[this.#activeIndex()]?.nativeElement;
      if (this.isCountryPanelOpen() && activeOption instanceof HTMLElement) {
        activeOption.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  focusNumberInput(): void {
    this.phoneInput()?.inputElement?.nativeElement?.focus();
  }

  onBlur(): void {
    this.#onTouched();
  }

  onCountryOptionSelected(option: PhoneFieldCountryOption): void {
    this.#update(changePhoneCountry(this.#state(), option.country));
    this.#setQuery(null);
    const phoneElement: HTMLInputElement | undefined = this.phoneInput()?.inputElement?.nativeElement;
    phoneElement?.focus();
  }

  onCountryPanelDetached(): void {
    this.#setQuery(null);
  }

  onKeyPress(event: KeyboardEvent): boolean {
    return ContactPhoneFieldComponent.ALLOWED_KEY.test(event.key);
  }

  onPhoneInput(event: Event): void {
    this.#update(readPhoneInput(this.#readInputText(event), this.country()));
  }

  onPrefixArrow(step: number, event: Event): void {
    event.preventDefault();
    if (!this.isCountryPanelOpen()) {
      this.#setQuery('');
      return;
    }
    const optionsCount = this.filteredCountryOptions().length;
    if (optionsCount > 0) {
      this.#activeIndex.update(index => (index + step + optionsCount) % optionsCount);
    }
  }

  onPrefixClick(): void {
    if (!this.#isDisabled() && !this.isCountryPanelOpen()) {
      this.#setQuery('');
    }
  }

  onPrefixEnter(event: Event): void {
    if (!this.isCountryPanelOpen()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const option = this.filteredCountryOptions()[this.#activeIndex()];
    if (option !== undefined) {
      this.onCountryOptionSelected(option);
    }
  }

  onPrefixEscape(event: Event): void {
    if (!this.isCountryPanelOpen()) {
      return;
    }
    event.stopPropagation();
    this.#setQuery(null);
  }

  onPrefixFocusOut(): void {
    this.#setQuery(null);
    this.#onTouched();
  }

  onPrefixInput(event: Event): void {
    this.#setQuery(this.#readInputText(event));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.#isDisabled.set(isDisabled);
    if (isDisabled) {
      this.prefixControl.disable({ emitEvent: false });
    } else {
      this.prefixControl.enable({ emitEvent: false });
    }
  }

  writeValue(value: string | null | undefined): void {
    const state = toPhoneFieldState(value, this.country() ?? this.#defaultCountryCode());
    this.#lastReportedValue = state.value;
    this.#state.set(state);
  }

  #readInputText(event: Event): string {
    return event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  #cancelCountryListReveal(): void {
    if (this.#countryListRevealFrameId !== null) {
      cancelAnimationFrame(this.#countryListRevealFrameId);
      this.#countryListRevealFrameId = null;
    }
    if (this.#countryListRevealTimeoutId !== null) {
      clearTimeout(this.#countryListRevealTimeoutId);
      this.#countryListRevealTimeoutId = null;
    }
  }

  #revealCountryListAfterPaint(): void {
    this.#cancelCountryListReveal();
    this.#countryListRevealFrameId = requestAnimationFrame(() => {
      this.#countryListRevealFrameId = null;
      this.#countryListRevealTimeoutId = setTimeout(() => {
        this.#countryListRevealTimeoutId = null;
        if (this.isCountryPanelOpen()) {
          this.#isCountryListReady.set(true);
        }
      });
    });
  }

  #setQuery(query: string | null): void {
    const wasOpen = this.isCountryPanelOpen();
    this.#query.set(query);
    if (query === null) {
      this.#cancelCountryListReveal();
    } else if (!wasOpen) {
      this.#revealCountryListAfterPaint();
    }
  }

  #setOptionalAttribute(element: HTMLElement, name: string, value: string | null): void {
    if (value === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  }

  #update(state: PhoneFieldState): void {
    this.#state.set(state);
    if (state.value !== this.#lastReportedValue) {
      this.#lastReportedValue = state.value;
      this.#onChange(state.value);
    }
  }
}
