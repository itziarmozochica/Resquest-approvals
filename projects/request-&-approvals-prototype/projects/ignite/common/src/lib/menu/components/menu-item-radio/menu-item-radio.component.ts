import { UniqueSelectionDispatcher } from '@angular/cdk/collections';
import { CdkMenuItemRadio } from '@angular/cdk/menu';
import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntMenuComponent } from '../../menu.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-checked]': 'isChecked()',
    class: 'ignt-menu-item-radio',
  },
  hostDirectives: [
    {
      directive: CdkMenuItemRadio,
      inputs: ['cdkMenuItemDisabled: disabled'],
      outputs: ['cdkMenuItemTriggered: triggered'],
    },
  ],
  imports: [NgTemplateOutlet],
  selector: 'ignt-menu-item-radio',
  styleUrl: './menu-item-radio.component.scss',
  templateUrl: './menu-item-radio.component.html',
})
export class IgntMenuItemRadioComponent {
  readonly #cdkMenuItemRadio = inject(CdkMenuItemRadio);
  readonly #parentMenu = inject(IgntMenuComponent);
  readonly #selectionDispatcher = inject(UniqueSelectionDispatcher);

  /* Text to be displayed */
  readonly label = input.required<string>();
  /* Value to be emitted by the Menu when the given item is picked. Intended to be unique within its group. */
  readonly value = input.required<string>();
  /* Whether the item is the checked option of its radio group */
  readonly checked = input(false, { transform: booleanAttribute });
  /* Whether the item is disabled or not */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly isChecked = signal(false);
  protected readonly menuItemCustomTemplate = computed(() => this.#parentMenu.menuItemCustomTemplate());
  protected readonly templateContext = computed(() => ({
    $implicit: {
      checked: this.isChecked(),
      disabled: this.disabled(),
      label: this.label(),
      value: this.value(),
    },
  }));

  constructor() {
    const removeListener = this.#selectionDispatcher.listen(() => {
      this.isChecked.set(this.#cdkMenuItemRadio.checked);
    });
    inject(DestroyRef).onDestroy(removeListener);

    this.#cdkMenuItemRadio.triggered.pipe(takeUntilDestroyed()).subscribe(() => {
      this.#parentMenu.menuItemSelected.emit(this.value());
    });

    effect(() => {
      const checked = this.checked();
      untracked(() => {
        if (checked) {
          this.#selectionDispatcher.notify('ignt-menu-item-radio', '');
        }
        this.#cdkMenuItemRadio.checked = checked;
        this.isChecked.set(checked);
      });
    });
  }
}
