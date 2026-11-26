import { getCurrencySymbol } from '@angular/common';
import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
} from '@angular/core';
import { ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';

import { TranslateService } from '@ngx-translate/core';
import AutoNumeric, { CurrencySymbolPlacementOption } from 'autonumeric';

import { MobileOS } from '../../models/device/device.model';
import { DeviceService } from '../../services/device/device.service';
import { DualScreenStorageService } from '../../services/dual-screen/dual-screen-storage.service';
import {
  NUMERIC_FORMATTER_FACTORY,
  NumericFormatter,
  NumericFormatterFactory,
} from './numeric-formatter-factory/numeric-formatter-factory';

const autonumericFormatterFactory: NumericFormatterFactory = {
  create: (elementOrSelector: HTMLInputElement, initialValue?: string, options?: AutoNumeric.Options): NumericFormatter =>
    new AutoNumeric(elementOrSelector, initialValue, options),

  format: (value: number, options: AutoNumeric.Options) => AutoNumeric.format(value, options),
};

type OnChangeFn = (quantity: number) => void;

interface InputOptions {
  currency: string;
  suffixText: string;
  decimalPlaces: number;
}

const ATM_NAVIGATION_KEYS = new Set<string>([
  'Tab',
  'Enter',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
]);

@Directive({
  selector: 'input[appAutoformatNumericInput]',
  providers: [
    {
      provide: NUMERIC_FORMATTER_FACTORY,
      useValue: autonumericFormatterFactory,
    },
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: AutoformatNumericInputDirective,
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: AutoformatNumericInputDirective,
    },
  ],
  standalone: false,
})
export class AutoformatNumericInputDirective implements OnInit, OnDestroy, OnChanges, ControlValueAccessor, Validator {
  #atmCentsBuffer = 0;
  #atmLastOptions: AutoNumeric.Options | null = null;
  #autonumericInstance: NumericFormatter | null = null;
  #deviceService = inject(DeviceService);
  #dualScreenStorageService = inject(DualScreenStorageService);
  #elRef = inject(ElementRef);
  #isDualScreen = false;
  #numericFormatterFactory = inject(NUMERIC_FORMATTER_FACTORY);
  #renderer = inject(Renderer2);
  #translate = inject(TranslateService);
  @Input() atmMaxAmount: number | null = null;
  @Input() atmMaxDigits: number | null = null;
  @Input() atmMode = false;
  @Input() currency: string | undefined = undefined;
  @Input() decimalPlaces: number | undefined = undefined;
  onChange!: OnChangeFn;
  onTouched: () => void;
  onValidatorChange: () => void;
  @Input() placeHolderValue: number | string = '';
  @Output() rawValue = new EventEmitter<number>();
  @Input() suffixText = '';
  @Input() value = '';

  constructor() {
    this.onTouched = () => {};
    this.onValidatorChange = () => {};
  }

  getNumberFormatter(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
    return new Intl.NumberFormat(locale, options);
  }

  ngOnChanges({ currency, placeHolderValue, value, decimalPlaces, suffixText }: SimpleChanges): void {
    if (value && !this.atmMode) {
      this.#updateAutonumericWithValueInput();
    }
    if (currency || placeHolderValue || decimalPlaces || suffixText) {
      const options = this.#getAutonumericOptions(this.#translate.currentLang, {
        currency: this.currency,
        suffixText: this.suffixText,
        decimalPlaces: this.decimalPlaces,
      });
      this.#atmLastOptions = options;
      if (this.atmMode) {
        this.#autonumericInstance?.detach();
        this.#autonumericInstance = null;
        this.#renderAtmValue();
      } else if (this.#autonumericInstance !== null) {
        this.#autonumericInstance.update(options);
      } else {
        this.#autonumericInstance = this.#numericFormatterFactory.create(this.#elRef.nativeElement as HTMLInputElement, '', options);
        this.#updateAutonumericWithValueInput();
      }
      this.#setPlaceholder(options);
    }
    this.onValidatorChange?.();
  }

  ngOnDestroy(): void {
    this.#autonumericInstance?.detach();
  }

  ngOnInit(): void {
    this.#renderer.setAttribute(this.#elRef.nativeElement, 'inputmode', 'numeric');
    this.#isDualScreen = this.#dualScreenStorageService.containsData();
  }

  @HostListener('blur', ['$event'])
  onBlur(): void {
    this.onTouched?.();
  }

  @HostListener('input', ['$event'])
  onInput(): void {
    if (this.atmMode) {
      return;
    }
    const manageInputValue = () => {
      this.onTouched?.();
      const output = this.#getCurrentValue();
      this.rawValue.emit(output);
      this.onChange?.(output);
    };
    if (this.#deviceService.getDeviceOS() === MobileOS.Android || this.#isDualScreen) {
      setTimeout(() => manageInputValue());
    } else {
      manageInputValue();
    }
  }

  @HostListener('keydown', ['$event'])
  onAtmKeydown(event: KeyboardEvent): void {
    if (!this.atmMode) {
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      return;
    }
    const { key } = event;
    if (ATM_NAVIGATION_KEYS.has(key)) {
      return;
    }
    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      this.#atmCentsBuffer = Math.floor(this.#atmCentsBuffer / 10);
      this.#applyAtmBuffer();
      return;
    }
    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      const digit = Number(key);
      const nextBuffer = this.#atmCentsBuffer * 10 + digit;
      if (!this.#atmBufferFitsLimits(nextBuffer)) {
        return;
      }
      this.#atmCentsBuffer = nextBuffer;
      this.#applyAtmBuffer();
      return;
    }
    event.preventDefault();
  }

  @HostListener('paste', ['$event'])
  onAtmPaste(event: ClipboardEvent): void {
    if (!this.atmMode) {
      return;
    }
    event.preventDefault();
    const clipboard = event.clipboardData?.getData('text') ?? '';
    const digits = clipboard.replace(/[^0-9]/g, '');
    if (digits.length === 0) {
      return;
    }
    let nextBuffer = this.#atmCentsBuffer;
    for (const char of digits) {
      const candidate = nextBuffer * 10 + Number(char);
      if (!this.#atmBufferFitsLimits(candidate)) {
        break;
      }
      nextBuffer = candidate;
    }
    if (nextBuffer === this.#atmCentsBuffer) {
      return;
    }
    this.#atmCentsBuffer = nextBuffer;
    this.#applyAtmBuffer();
  }

  registerOnChange(fn: OnChangeFn): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  registerOnValidatorChange?(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    (this.#elRef.nativeElement as HTMLInputElement).disabled = isDisabled;
  }

  validate(): ValidationErrors {
    return {};
  }

  writeValue(quantity: number): void {
    if (this.atmMode) {
      this.#atmCentsBuffer = this.#toAtmBuffer(quantity);
      this.#renderAtmValue();
      return;
    }
    if (this.#autonumericInstance !== null) {
      this.#autonumericInstance.set(quantity);
    }
  }

  #applyAtmBuffer(): void {
    const decimalPlaces = this.#atmDecimalPlaces();
    const value = this.#atmCentsBuffer / Math.pow(10, decimalPlaces);
    this.#renderAtmValue();
    this.onTouched?.();
    this.rawValue.emit(value);
    this.onChange?.(value);
  }

  #atmBufferFitsLimits(buffer: number): boolean {
    if (!Number.isFinite(buffer) || buffer < 0) {
      return false;
    }
    if (this.atmMaxAmount != null) {
      const decimalPlaces = this.#atmDecimalPlaces();
      const maxBuffer = Math.round(this.atmMaxAmount * Math.pow(10, decimalPlaces));
      if (buffer > maxBuffer) {
        return false;
      }
    }
    if (this.atmMaxDigits != null && this.atmMaxDigits > 0) {
      const maxBuffer = Math.pow(10, this.atmMaxDigits) - 1;
      if (buffer > maxBuffer) {
        return false;
      }
    }
    return true;
  }

  #atmDecimalPlaces(): number {
    if (this.#atmLastOptions?.decimalPlaces != null) {
      return Number(this.#atmLastOptions.decimalPlaces);
    }
    if (this.decimalPlaces != null) {
      return this.decimalPlaces;
    }
    return 2;
  }

  #createSeparatorRegexpGroup(name: string): string {
    return `(?<${name}>,|\\.|\\s)`;
  }

  #getAutonumericOptions(lang: string, options: Partial<InputOptions> = {}): AutoNumeric.Options {
    const alternativeSeparator = (separator: string) => (separator === '.' ? ',' : '.');
    const min = this.#getSanitizedNumericAttribute('min');
    const max = this.#getSanitizedNumericAttribute('max');
    const { patterDecimalCharacter, patterDigitGroupSeparator, decimalPlaces, currencySymbolPlacement } =
      this.#getPatternDecimalsAndSeparator(lang, options);
    const decimalCharacter = patterDecimalCharacter ?? alternativeSeparator(patterDigitGroupSeparator);
    const digitGroupSeparator = patterDigitGroupSeparator ?? alternativeSeparator(decimalCharacter);
    const { currency, suffixText } = options;

    return {
      ...(currency
        ? {
            currencySymbol: getCurrencySymbol(currency, 'narrow'),
            currencySymbolPlacement,
          }
        : { currencySymbol: '' }),
      ...(min ? { minimumValue: min } : {}),
      ...(max ? { maximumValue: max } : {}),
      ...(suffixText ? { suffixText } : { suffixText: '' }),
      decimalPlaces,
      decimalCharacter,
      digitGroupSeparator,
      decimalCharacterAlternative: digitGroupSeparator,
      emptyInputBehavior: 'press',
      onInvalidPaste: 'ignore',
      modifyValueOnWheel: false,
    };
  }

  #getCurrentValue(): number {
    const value = parseFloat(this.#autonumericInstance?.getNumericString() ?? '');
    return isNaN(value) ? NaN : value;
  }

  #getNumberPattern(locale: string, { currency, decimalPlaces }: Partial<InputOptions>): string {
    const formatProperties = {
      ...(decimalPlaces !== undefined && decimalPlaces !== null
        ? {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }
        : {}),
      ...(currency ? { style: 'currency' as const, currency } : {}),
      useGrouping: true,
    };

    return this.getNumberFormatter(locale, formatProperties).format(1000);
  }

  #getPatternDecimalsAndSeparator(
    locale: string,
    options: Partial<InputOptions> = {},
  ): {
    patterDecimalCharacter: string;
    decimalPlaces: number;
    currencySymbolPlacement: CurrencySymbolPlacementOption;
    patterDigitGroupSeparator: string;
  } {
    const regExp = this.#getTemplateRegExp();
    const pattern = this.#getNumberPattern(locale, options);
    const { decimalCharacter, decimals, digitGroupSeparator } = regExp.exec(pattern)?.groups ?? {};
    const currencyPosition = pattern.search(/[^0-9,\\.]/);
    const currencySymbolPlacement = currencyPosition < 0 ? 'p' : currencyPosition === 0 ? 'p' : 's';

    return {
      patterDecimalCharacter: decimalCharacter,
      patterDigitGroupSeparator: digitGroupSeparator,
      decimalPlaces: decimals?.length ?? 0,
      currencySymbolPlacement,
    };
  }

  #getSanitizedNumericAttribute(attributeName: string): string {
    const element = this.#elRef.nativeElement as HTMLInputElement;
    const value = element.getAttribute(attributeName);
    if (value === null || value === '' || value === 'null' || value === 'undefined') {
      return '';
    }
    if (!Number.isNaN(Number(value))) {
      return value;
    }
    throw Error(`Value for attribute '${attributeName}' must be a number`);
  }

  #getTemplateRegExp(): RegExp {
    const decimalSeparatorRegExpGroup = this.#createSeparatorRegexpGroup('decimalCharacter');
    const digitGroupSeparatorRegExpGroup = this.#createSeparatorRegexpGroup('digitGroupSeparator');
    const decimalPart = `${decimalSeparatorRegExpGroup}(?<decimals>0+)`;
    const integerPart = `1${digitGroupSeparatorRegExpGroup}?0+`;

    return new RegExp(`(?:${integerPart})(?:${decimalPart})?`);
  }

  #renderAtmValue(): void {
    if (!this.atmMode || this.#atmLastOptions === null) {
      return;
    }
    const decimalPlaces = this.#atmDecimalPlaces();
    const value = this.#atmCentsBuffer / Math.pow(10, decimalPlaces);
    const input = this.#elRef.nativeElement as HTMLInputElement;
    input.value = this.#numericFormatterFactory.format(value, this.#atmLastOptions);
    const cursor = input.value.length;
    if (typeof input.setSelectionRange === 'function') {
      try {
        input.setSelectionRange(cursor, cursor);
      } catch {
        // setSelectionRange throws on some input types; safe to ignore.
      }
    }
  }

  #setPlaceholder(options: AutoNumeric.Options): void {
    (this.#elRef.nativeElement as HTMLInputElement).placeholder =
      typeof this.placeHolderValue === 'number'
        ? this.#numericFormatterFactory.format(this.placeHolderValue, options)
        : (this.placeHolderValue ?? '');
  }

  #toAtmBuffer(quantity: number | null | undefined): number {
    if (quantity == null || Number.isNaN(quantity)) {
      return 0;
    }
    const decimalPlaces = this.#atmDecimalPlaces();
    return Math.max(0, Math.round(quantity * Math.pow(10, decimalPlaces)));
  }

  #updateAutonumericWithValueInput(): void {
    if (this.value && this.#autonumericInstance) {
      this.writeValue(parseFloat(this.value));
    }
  }
}
