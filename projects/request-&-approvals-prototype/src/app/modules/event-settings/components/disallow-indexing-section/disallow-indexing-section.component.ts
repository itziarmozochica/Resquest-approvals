import { ChangeDetectionStrategy, Component, forwardRef, input, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule } from '@ngx-translate/core';

import { DisallowIndexingSectionConfig } from '../../models/settings-configs.model';

@Component({
  selector: 'app-disallow-indexing-section',
  templateUrl: './disallow-indexing-section.component.html',
  styleUrls: ['./disallow-indexing-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IgntToggleComponent, TranslateModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DisallowIndexingSectionComponent),
      multi: true,
    },
  ],
})
export class DisallowIndexingSectionComponent implements ControlValueAccessor {
  #isDisabled = false;
  #onChange: (value: boolean) => void = () => {};
  #onTouched: () => void = () => {};
  #value = false;

  get canEditDisallowIndexing(): boolean {
    return this.config?.disallowIndexing.editable ?? true;
  }

  get isDisabled(): boolean {
    return this.#isDisabled || !this.canEditDisallowIndexing || !this.canEditPlan();
  }

  get value(): boolean {
    return this.#value;
  }

  set value(val: boolean) {
    if (val !== this.#value) {
      this.#value = val;
      this.#onChange(val);
      this.#onTouched();
    }
  }

  readonly canEditPlan = input<boolean>(true);
  @Input() config: DisallowIndexingSectionConfig | null = null;

  onDisallowIndexingChange(event: Event): void {
    if (this.isDisabled) {
      return;
    }
    const target = event.target as HTMLInputElement;
    const newValue = target.checked;
    this.value = newValue;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.#isDisabled = isDisabled;
  }

  writeValue(value: boolean): void {
    this.#value = value ?? false;
  }
}
