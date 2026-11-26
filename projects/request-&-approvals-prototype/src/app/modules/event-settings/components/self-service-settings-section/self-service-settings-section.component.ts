import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { FeverOnlyMarkerComponent } from '@fz-original/app/shared/components/fever-only-marker/fever-only-marker.component';
import { IgntAlertComponent, IgntSwitchComponent } from '@ignite/common';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

import { DeclarativeInventorySectionState } from '../../models/declarative-inventory.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FeverOnlyMarkerComponent, IgntAlertComponent, IgntSwitchComponent, IgntWrapperCardComponent, TranslateModule],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelfServiceSettingsSectionComponent),
    },
  ],
  selector: 'app-self-service-settings-section',
  styleUrl: './self-service-settings-section.component.scss',
  templateUrl: './self-service-settings-section.component.html',
})
export class SelfServiceSettingsSectionComponent implements ControlValueAccessor {
  readonly #hasDeclarativeInventory = signal(false);
  readonly #isControlDisabled = signal(false);

  #onChange: (value: boolean) => void = () => {};

  #onTouched: () => void = () => {};

  readonly canEditPlan = input<boolean>(true);
  readonly state = input<DeclarativeInventorySectionState>({ hasLoadFailed: false, isLoading: false, nonConformities: [] });

  protected readonly hasDeclarativeInventory = this.#hasDeclarativeInventory.asReadonly();
  protected readonly hasLoadFailed = computed(() => this.state().hasLoadFailed);
  protected readonly isDisabled = computed(
    () => this.#isControlDisabled() || this.state().isLoading || this.state().hasLoadFailed || !this.canEditPlan(),
  );
  protected readonly nonConformities = computed(() => this.state().nonConformities);

  registerOnChange(fn: (value: boolean) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.#isControlDisabled.set(isDisabled);
  }

  writeValue(value: boolean | null): void {
    this.#hasDeclarativeInventory.set(value ?? false);
  }

  protected onToggleChange(enabled: boolean): void {
    if (this.isDisabled()) {
      return;
    }

    if (enabled === this.#hasDeclarativeInventory()) {
      return;
    }

    this.#hasDeclarativeInventory.set(enabled);
    this.#onChange(enabled);
    this.#onTouched();
  }
}
