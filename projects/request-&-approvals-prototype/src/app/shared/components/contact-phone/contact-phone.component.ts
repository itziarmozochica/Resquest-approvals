import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  forwardRef,
  inject,
  input,
  Input,
  OnInit,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormControl, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { TelTypeCountryCode } from '@fz-original/app/shared/booking-questions/models';
import { InputMobileBehaviorModule } from '@fz-original/app/shared/directives/input-mobile-behavior/input-mobile-behavior.module';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IngtFormError } from '@ignite/legacy/models/ignt-input.model';
import { TranslateModule } from '@ngx-translate/core';
import {
  formatIncompletePhoneNumber,
  getExampleNumber,
  CountryCode as LibPhoneNumberCountryCode,
  parsePhoneNumber,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';

import { TelTypeValue } from '../../booking-questions/models/tel-type.value';
import { TelTypePhoneService } from '../../booking-questions/modules/form-group/tel-type/tel-type-phone.service';
import { IgntTypeaheadModule } from '../../layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '../../layout/filters/select/select.interface';
import { TypeaheadEvent } from '../../layout/filters/typeahead/typeahead-event.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    IgntInputFieldComponent,
    IgntFieldErrorComponent,
    FormsModule,
    ReactiveFormsModule,
    IgntTypeaheadModule,
    InputMobileBehaviorModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ContactPhoneComponent),
      multi: true,
    },
  ],
  selector: 'app-contact-phone',
  standalone: true,
  styleUrls: ['./contact-phone.component.scss'],
  templateUrl: './contact-phone.component.html',
})
export class ContactPhoneComponent implements ControlValueAccessor, OnInit {
  #destroyRef = inject(DestroyRef);
  #phoneService = inject(TelTypePhoneService);

  get phoneErrors(): IngtFormError[] {
    if (!this.error) {
      return [];
    }

    return [this.error];
  }

  get showCountryRequiredError(): boolean {
    return this.isMandatory && this.countryTouched && !this.countryCode;
  }

  countryCode: TelTypeCountryCode | null = null;
  countryCodes: WritableSignal<TelTypeCountryCode[]> = signal([]);
  countryIdAsCountryCode: LibPhoneNumberCountryCode | null = null;
  countryOptions: WritableSignal<SelectOption[]> = signal([]);
  countryTouched = false;
  @Input() defaultCountry = '';
  defaultCountryOption: SelectOption | null = null;
  @Input() error: IngtFormError | null = null;
  @Input() id = '';
  isDisabled = false;
  @Input() isMandatory = false;
  readonly isOptional = input(false);

  onChange: (_: TelTypeValue) => void = () => {};

  onTouched: () => void = () => {};
  phone = '';
  phoneInNationalFormat = '';

  phonePlaceholder = '';

  prefix: string | null = null;

  prefixFormControl = new FormControl({ value: '', disabled: true });

  selectedCountryOption: Signal<SelectOption | undefined> = computed(() => {
    const currentCountry = this.countryCode ?? this.defaultCountryOption;
    if (!currentCountry) {
      return undefined;
    }

    return this.countryOptions().find(option => option.id === currentCountry.id);
  });

  ngOnInit(): void {
    this.#loadCountryCodes();
  }

  onCountrySelected(option: SelectOption): void {
    this.countryTouched = true;
    const selectedCountry = this.countryCodes().find(c => c.id === option.id);
    if (selectedCountry) {
      this.onSelectedCountry(selectedCountry);
    }
  }

  onKeyPress(event: KeyboardEvent): boolean {
    return new RegExp(/[()\-\s|0-9]/g).test(event.key) && this.phone.length < 14;
  }

  onPhoneInputChange(event: string | Event): void {
    let value: string;
    if (typeof event === 'string') {
      value = event;
    } else if (event.target) {
      value = (event.target as HTMLInputElement).value;
    } else if ('value' in event) {
      value = (event as { value: string }).value;
    } else {
      value = '';
    }

    this.onTelInput(value);
  }

  onSelectedCountry(countryCode?: TelTypeCountryCode | null): void {
    if (countryCode) {
      this.prefix = '+' + countryCode.code;
      this.countryCode = countryCode;
      this.countryIdAsCountryCode = this.countryCode.id.toUpperCase() as LibPhoneNumberCountryCode;
      this.prefixFormControl.setValue(this.prefix ?? '');
      const exampleNumber = getExampleNumber(this.countryIdAsCountryCode, examples);
      this.phonePlaceholder = exampleNumber ? exampleNumber.formatNational() : '';
      this.onTelInput(this.phone);
    } else {
      this.prefix = null;
      this.countryCode = null;
      this.countryIdAsCountryCode = null;
      this.phonePlaceholder = '';
      this.phone = '';
      this.phoneInNationalFormat = '';
      this.prefixFormControl.setValue('');
    }

    this.#onInput();
  }

  onTelInput(phone: string): void {
    if (phone === '') {
      this.phone = '';
      this.phoneInNationalFormat = '';
    } else if (this.countryIdAsCountryCode) {
      this.phoneInNationalFormat = formatIncompletePhoneNumber(phone, this.countryIdAsCountryCode);
      try {
        this.phone = parsePhoneNumber(phone, this.countryIdAsCountryCode).nationalNumber;
      } catch {
        this.phone = this.phoneInNationalFormat;
      }
    }
    this.#onInput();
  }

  onUserInteraction(event: TypeaheadEvent): void {
    this.countryTouched = true;
    if (event.selectedOption === '' || !event.selectedOption) {
      this.onSelectedCountry(null);
    }
  }

  registerOnChange(fn: (value: TelTypeValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  writeValue(value: TelTypeValue): void {
    if (value) {
      this.prefix = value.prefix || null;
      this.phone = value.phone || '';

      if (value.country && this.countryCodes().length > 0) {
        const foundCountry = this.countryCodes().find(c => c.id.toUpperCase() === value.country);
        if (foundCountry) {
          this.onSelectedCountry(foundCountry);
        }
      }
    } else {
      this.prefix = null;
      this.phone = '';
      this.countryCode = null;
      this.phoneInNationalFormat = '';
    }
  }

  #loadCountryCodes(): void {
    this.#phoneService
      .countryCodes()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(codes => {
        this.countryCodes.set(codes);

        const options: SelectOption[] = codes.map(country => ({
          id: country.id,
          title: `${country.countryName} (+${country.code})`,
        }));

        this.countryOptions.set(options);
        if (this.defaultCountry) {
          const defaultCountryFound: TelTypeCountryCode | undefined = codes.find(
            country => country.id.toLowerCase() === this.defaultCountry.toLowerCase(),
          );
          if (defaultCountryFound) {
            this.countryCode = defaultCountryFound;
            this.onSelectedCountry(defaultCountryFound);
            this.prefixFormControl.setValue(this.prefix);
            this.countryTouched = false;
            this.defaultCountryOption = {
              id: defaultCountryFound.id,
              title: `${defaultCountryFound.countryName} (+${defaultCountryFound.code})`,
            };
          }
        }
      });
  }

  #onInput(): void {
    const value: TelTypeValue = {
      prefix: this.prefix,
      phone: this.phone,
      country: this.countryCode ? this.countryCode.id.toUpperCase() : null,
    };
    this.onChange(value);
    this.onTouched();
  }
}
