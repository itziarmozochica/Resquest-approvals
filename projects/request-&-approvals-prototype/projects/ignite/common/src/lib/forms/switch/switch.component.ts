import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input, model, signal, type Signal } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

import { IgntIconComponent } from '@ignite/icon';

import { IgntUUIDDirective } from '../../core/directives/uuid.directive';

/**
 * A switch lets users turn a single setting on or off. The change takes effect right away, with
 * no Save or Submit button needed. It can be used on its own or with a label and an optional
 * description; when it has a label, the whole row is clickable.
 *
 * ### When to use
 * - For a setting that is either on or off and takes effect immediately, such as "Hide prices on tickets"
 * - When the label describes the "on" state clearly, so the user knows what turning it on will do
 *
 * ### When NOT to use
 * - A choice inside a sentence, or a consent the user must tick → use a [checkbox](?path=/docs/components-selection-checkbox--docs) instead
 * - More than two options → use a radio group or [pill buttons](?path=/docs/components-selection-pill-button--docs) instead
 * - A destructive change that needs confirming → open a [confirm modal](?path=/docs/components-containment-dialog-confirm--docs) between the toggle and the commit
 *
 * ### Related
 * - [Pill Button](?path=/docs/components-selection-pill-button--docs) — toggle-like selection among options
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ignt-switch--contrast]': 'contrast()',
    '[class.ignt-switch--row]': 'hasLabel()',
  },
  hostDirectives: [IgntUUIDDirective],
  imports: [IgntIconComponent, NgTemplateOutlet],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: IgntSwitchComponent,
    },
  ],
  selector: 'ignt-switch',
  styleUrl: './switch.component.scss',
  templateUrl: './switch.component.html',
})
export class IgntSwitchComponent implements ControlValueAccessor {
  /** Whether the switch is on. Two-way bindable (`[(checked)]`); off by default. */
  readonly checked = model(false);

  /**
   * Id of an element elsewhere on the page that describes the bare switch, such as the description
   * of the row that embeds it. Ignored when the switch renders its own `description`.
   */
  readonly ariaDescribedby = input<string | undefined>(undefined);

  /**
   * Accessible name for the bare switch, which has no visible text. Required when `label` is
   * empty; ignored when `label` is set, because the visible label names the control.
   */
  readonly ariaLabel = input<string | undefined>(undefined);

  /** Renders the "-contrast" token set, for placement on a dark or coloured background. */
  readonly contrast = input(false, { transform: booleanAttribute });

  /** Secondary text under the label stating the consequence of turning it on. Needs `label`. */
  readonly description = input<string>('');

  /** Prevents toggling. A form control's disabled state applies as well. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Visible label, written as the affirmative statement the "on" state makes. Setting it
   * switches the layout to a full-width row with the switch pinned to the end.
   */
  readonly label = input<string>('');

  readonly #uuidDirective = inject(IgntUUIDDirective);
  readonly #isFormDisabled = signal<boolean>(false);
  #onChange: ((value: boolean) => void) | null = null;
  #onTouched: (() => void) | null = null;

  protected readonly controlId = `ignt-switch-control-${this.#uuidDirective.uuid}`;
  protected readonly descriptionId = `ignt-switch-description-${this.#uuidDirective.uuid}`;
  protected readonly hasLabel: Signal<boolean> = computed(() => this.label() !== '');
  protected readonly hasDescription: Signal<boolean> = computed(() => this.hasLabel() && this.description() !== '');
  protected readonly isDisabled: Signal<boolean> = computed(() => this.disabled() || this.#isFormDisabled());
  protected readonly labelId = `ignt-switch-label-${this.#uuidDirective.uuid}`;

  registerOnChange(fn: (value: boolean) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.#isFormDisabled.set(isDisabled);
  }

  writeValue(value: boolean | null): void {
    this.checked.set(value === true);
  }

  protected onBlur(): void {
    this.#onTouched?.();
  }

  protected toggle(): void {
    if (this.isDisabled()) {
      return;
    }
    const next = !this.checked();
    this.checked.set(next);
    this.#onChange?.(next);
  }
}
