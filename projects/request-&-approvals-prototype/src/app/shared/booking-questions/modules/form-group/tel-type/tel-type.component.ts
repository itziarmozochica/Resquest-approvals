import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import {
  CountryCode,
  formatIncompletePhoneNumber,
  getExampleNumber,
  CountryCode as LibPhoneNumberCountryCode,
  parsePhoneNumber,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';

import { TelTypeCountryCode } from '../../../models/tel-type-country-code';
import { TelTypeValue } from '../../../models/tel-type.value';

@Component({
  selector: 'app-booking-question-tel',
  standalone: false,
  templateUrl: './tel-type.component.html',
  styleUrls: ['./tel-type.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TelTypeComponent),
      multi: true,
    },
  ],
})
export class TelTypeComponent implements ControlValueAccessor, OnChanges {
  readonly #changeDetectorRef = inject(ChangeDetectorRef);

  countryCode: TelTypeCountryCode | null = null;
  @Input() countryCodes!: Array<TelTypeCountryCode>;
  countryIdAsCountryCode: LibPhoneNumberCountryCode | null = null;

  @Input() error!: string;
  @Input() id!: string;
  isDisabled = false;

  onChange: (_: TelTypeValue) => void = () => {};
  onTouched: () => void = () => {};
  phone = '';
  phoneInNationalFormat = '';
  phonePlaceholder = '';
  prefix: string | null = null;
  #value: TelTypeValue | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['countryCodes'] && this.countryCodes?.length && this.#value?.country && !this.countryCode) {
      this.#applyValueToCountry();
    }
  }

  onInput(): void {
    this.onChange({
      prefix: this.prefix,
      phone: this.phone,
      country: this.countryCode ? this.countryCode.id.toUpperCase() : null,
    });
  }

  onKeyPress(event: KeyboardEvent): boolean {
    return new RegExp(/[()\-\s|0-9]/g).test(event.key) && this.phone.length < 14;
  }

  onSelectedCountry(countryCode?: TelTypeCountryCode): void {
    if (countryCode) {
      this.#applyCountry(countryCode);
      this.onTelInput(this.phone);
    } else {
      this.prefix = null;
      this.#clearCountryState();
      this.phone = '';
      this.phoneInNationalFormat = '';
    }

    this.onInput();
  }

  onTelInput(phone: string): void {
    if (phone === '') {
      this.phone = '';
      this.phoneInNationalFormat = '';
    } else {
      this.#parsePhone(phone);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  writeValue(value: TelTypeValue | null): void {
    this.#value = value;
    this.prefix = value?.prefix ?? null;
    this.phone = value?.phone ?? '';
    this.phoneInNationalFormat = this.phone;

    if (value?.country) {
      this.#applyValueToCountry();
    } else {
      this.#clearCountryState();
    }

    this.#changeDetectorRef.markForCheck();
  }

  #clearCountryState(): void {
    this.countryCode = null;
    this.countryIdAsCountryCode = null;
    this.phonePlaceholder = '';
  }

  #applyCountry(country: TelTypeCountryCode): void {
    this.countryCode = country;
    this.countryIdAsCountryCode = country.id.toUpperCase() as LibPhoneNumberCountryCode;
    this.prefix = '+' + country.code;
    const exampleNumber = getExampleNumber(this.countryIdAsCountryCode, examples);
    this.phonePlaceholder = exampleNumber ? exampleNumber.formatNational() : '';
  }

  #applyValueToCountry(): void {
    if (!this.#value?.country || !this.countryCodes?.length) {
      return;
    }

    const foundCountry = this.countryCodes.find(country => country.id.toUpperCase() === this.#value!.country!.toUpperCase());

    if (!foundCountry) {
      return;
    }

    this.#applyCountry(foundCountry);

    if (this.phone) {
      this.#parsePhone(this.phone);
    }

    this.#changeDetectorRef.markForCheck();
  }

  #parsePhone(phone: string): void {
    this.phoneInNationalFormat = formatIncompletePhoneNumber(phone, this.countryIdAsCountryCode as CountryCode);
    try {
      this.phone = parsePhoneNumber(phone, this.countryIdAsCountryCode as CountryCode).nationalNumber;
    } catch {
      this.phone = this.phoneInNationalFormat;
    }
  }
}
