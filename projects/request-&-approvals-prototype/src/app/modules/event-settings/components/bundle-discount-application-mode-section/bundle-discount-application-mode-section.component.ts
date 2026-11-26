import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { FeverOnlyMarkerComponent } from '@fz-original/app/shared/components/fever-only-marker/fever-only-marker.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FeverOnlyMarkerComponent, IgntToggleComponent, IgntWrapperCardComponent, TranslateModule],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BundleDiscountApplicationModeSectionComponent),
    },
  ],
  selector: 'app-bundle-discount-application-mode-section',
  standalone: true,
  styleUrl: './bundle-discount-application-mode-section.component.scss',
  templateUrl: './bundle-discount-application-mode-section.component.html',
})
export class BundleDiscountApplicationModeSectionComponent implements ControlValueAccessor {
  readonly #isControlDisabled = signal(false);

  #onChange: (value: boolean) => void = () => {};

  #onTouched: () => void = () => {};

  protected readonly value = signal(false);

  readonly canEditPlan = input<boolean>(true);

  protected readonly isDisabled = computed(() => this.#isControlDisabled() || !this.canEditPlan());

  registerOnChange(fn: (value: boolean) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.#isControlDisabled.set(isDisabled);
  }

  writeValue(value: boolean): void {
    this.value.set(value ?? false);
  }

  protected onToggleChange(event: Event): void {
    if (this.isDisabled()) {
      return;
    }

    const checked = (event.target as HTMLInputElement).checked;

    if (checked === this.value()) {
      return;
    }

    this.value.set(checked);
    this.#onChange(checked);
    this.#onTouched();
  }
}
