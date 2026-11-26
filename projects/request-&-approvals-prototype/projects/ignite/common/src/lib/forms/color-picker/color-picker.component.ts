import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IgntColorSwatchDirective } from './color-picker-swatch.directive';
import { isValidHex, normalizeHex, normalizeHexInput } from './color-picker.utils';

/**
 * Color field: a hex text input, a native OS color picker and a row of preset
 * swatches. Stateless — the parent owns the value and reacts to `valueChange`.
 *
 * ### When to use
 * - Editing a single brand/accent color where operators want a hex field, the OS
 *   color picker and quick presets together.
 *
 * ### When NOT to use
 * - A binary or enumerated choice → use `ignt-pill-button` or a select instead.
 *
 * ### Related
 * - [Pill Button](?path=/docs/components-selection-pill-button--docs) — selectable option pill
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntColorSwatchDirective],
  selector: 'ignt-color-picker',
  standalone: true,
  styleUrl: './color-picker.component.scss',
  templateUrl: './color-picker.component.html',
})
export class IgntColorPickerComponent {
  /**
   * Accessible name for the field (it has no visible label). Applied to the hex
   * input, the native color picker and the presets group.
   */
  readonly ariaLabel = input<string>('');

  /** Hex used by the native picker, and the blur fallback when `value` is not a valid `#rrggbb`. */
  readonly defaultHex = input<string>('#000000');

  /** Prevents all interaction — typing, picking and preset selection. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Preset hex swatches rendered below the field, in the given order. */
  readonly presets = input<readonly string[]>([]);

  /** Current color as a hex string (e.g. `#e31b23`). Partial values are allowed while the user types. */
  readonly value = input<string>('');

  /** Emitted with the chosen hex whenever the user types, picks a color or selects a preset. */
  readonly valueChange = output<string>();

  /** The native `<input type="color">` requires a valid six-digit hex; fall back to `defaultHex`. */
  protected readonly pickerValue = computed<string>(() => {
    const current = this.value().trim();
    return isValidHex(current) ? current : this.defaultHex();
  });

  protected isPresetActive(hex: string): boolean {
    return normalizeHex(this.value(), '') === normalizeHex(hex, hex);
  }

  protected onHexBlur(value: string): void {
    if (this.disabled()) {
      return;
    }
    this.valueChange.emit(normalizeHex(value, this.defaultHex()));
  }

  protected onHexInput(value: string): void {
    if (this.disabled()) {
      return;
    }
    this.valueChange.emit(normalizeHexInput(value));
  }

  protected onPickerChange(value: string): void {
    if (this.disabled()) {
      return;
    }
    this.valueChange.emit(value.toLowerCase());
  }

  protected onPresetClick(hex: string): void {
    if (this.disabled()) {
      return;
    }
    this.valueChange.emit(normalizeHex(hex, hex));
  }
}
