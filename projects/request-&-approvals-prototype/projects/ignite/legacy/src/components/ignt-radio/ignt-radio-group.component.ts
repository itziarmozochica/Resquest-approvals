import { NgIf } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  forwardRef,
  inject,
  Injector,
  input,
  Input,
  OnInit,
  Output,
  QueryList,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, NgControl } from '@angular/forms';

import { RadioInputChange } from '@ignite/legacy/components/ignt-radio/types/radio-input-change.type';

import { IgntRadioComponent } from './ignt-radio.component';

@Component({
  selector: 'ignt-radio-group',
  templateUrl: './ignt-radio-group.component.html',
  styleUrls: ['./ignt-radio-group.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line no-use-before-define
      useExisting: forwardRef(() => IgntRadioGroupComponent),
      multi: true,
    },
  ],
  standalone: true,
  imports: [NgIf, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IgntRadioGroupComponent implements AfterContentInit, ControlValueAccessor, OnInit {
  #ngControl: NgControl | null = null;
  #injector = inject(Injector);

  readonly ariaLabel = input<string>();

  @Input() label?: string;
  @Input() formControlName!: string;

  @Input()
  set selected(selected: IgntRadioComponent | undefined) {
    const alreadySelected = (this._selected && this._selected.value) === (selected && selected.value);
    if (alreadySelected) {
      return;
    }

    if (this._selected) {
      this._selected.checked = false;
    }
    this._selected = selected;
    this.value = selected ? selected.value : undefined;
    this.checkSelectedRadio();
  }
  get selected() {
    return this._selected;
  }

  @Input()
  set value(newValue: string | number | boolean | undefined) {
    if (this._value !== newValue) {
      this._value = newValue;

      this.updateSelectedRadioFromValue();
      this.checkSelectedRadio();
    }

    this.#onTouch(newValue);
  }
  get value() {
    return this._value;
  }
  @ContentChildren(forwardRef(() => IgntRadioComponent), { descendants: true }) radios!: QueryList<IgntRadioComponent>;
  @Output() change = new EventEmitter<RadioInputChange>();

  protected _selected: IgntRadioComponent | undefined;
  protected _value: string | number | boolean | undefined;

  ngOnInit(): void {
    this.#ngControl = this.#injector.get(NgControl);
    if (this.#ngControl == null) {
      throw new Error('Please assign <ignt-radio> to a form control');
    }
  }

  ngAfterContentInit() {
    this.radios.changes.subscribe(() => {
      this.#updateRadioChangeHandler();
    });

    this.#updateRadioChangeHandler();
  }

  checkSelectedRadio() {
    if (this.selected && !this.selected?.checked) {
      this.selected.checked = true;
    }
  }

  updateSelectedRadioFromValue() {
    const alreadySelected = this.selected?.value === this._value;
    if (this.radios && !alreadySelected) {
      if (this.selected && this.value) {
        this.selected.checked = false;
      }
      this._selected = undefined;
      this.radios.forEach(radio => {
        if (radio.checked || radio.value === this.value) {
          this._selected = radio;
          this._selected.checked = true;
        }
        radio.detectChangesOnValueUpdated();
      });

      if (this.selected && !this.value) {
        this._value = this.selected.value;
      }
    }
  }

  emitChangeEvent(event: RadioInputChange) {
    this.change.emit(event);
    this.#propagateChange(event.value);
  }

  writeValue(value: string | number | boolean) {
    this.value = value;
    setTimeout(() => {
      this.updateSelectedRadioFromValue();
      this.checkSelectedRadio();
    });
  }

  registerOnChange(fn: (value: string | number | boolean | undefined) => void) {
    this.#propagateChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouch = fn;
  }

  #updateRadioChangeHandler() {
    this.radios.forEach(radio => {
      radio.registerRadioChangeHandler((event: RadioInputChange) => {
        if ((this.selected && this.selected.value) === event.value) {
          return;
        }
        if (this.selected) {
          this.selected.checked = false;
          this.selected.detectChangesOnValueUpdated();
        }
        this._selected = event.source;
        this._value = event.value;
        this.emitChangeEvent(event);
      });
      radio.name = this.formControlName;
    });
  }

  #onTouch: (value: string | number | boolean | undefined) => void = () => {};
  #propagateChange: (value: string | number | boolean | undefined) => void = () => {};
}
