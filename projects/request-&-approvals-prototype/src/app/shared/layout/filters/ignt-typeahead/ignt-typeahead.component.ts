import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  booleanAttribute,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  input,
  Input,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { Options } from '@popperjs/core';
import { fromEvent, merge } from 'rxjs';

import type { SelectDropdownPlanOption } from '../../../dropdown/select-dropdown-plan-option';
import type { SelectOption } from '../select/select.interface';
import { TypeaheadComponent } from '../typeahead/typeahead.component';
import { withViewportMaxHeight } from './typeahead-max-height.util';
import { withSameWidth } from './typeahead-same-width.util';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'ignt-typeahead',
  standalone: false,
  styleUrls: ['./ignt-typeahead.component.scss'],
  templateUrl: './ignt-typeahead.component.html',
})
export class IgntTypeaheadComponent extends TypeaheadComponent implements AfterViewInit {
  /** Class the base typeahead puts on the options matching its value. */
  static readonly selectedOptionClass = 'dropdown-item--selected';

  readonly #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #document = inject(DOCUMENT);

  @Input() container: 'body' | null = null;
  /**
   * Detaches the popup from the field and positions it against the viewport instead. Implies
   * `container="body"`, so it does not need to be passed alongside.
   *
   * An inline popup is pinned over its own field by `.field .dropdown-menu`
   * (`transform: none; inset: 0 0 auto`, see `theme/components/fields/textfield/textfield.scss`),
   * which overrides the positioner outright: it can only ever grow downwards, and it is clipped by
   * whatever scrolling ancestor the field sits in. That is invisible on a roomy desktop page and
   * fatal on a touch terminal, where the on-screen keyboard leaves a scroller a few rows tall.
   * Detached, the positioner is back in charge — the popup flips above the field when there is no
   * room below (`--detached` styles), and `withViewportMaxHeight` turns whatever is left over into
   * a scroll rather than rows nobody can reach.
   *
   * Left without an initializer so it stays off the instance, like `collapseOnClick` on the base
   * class: an initialized field is printed as an attribute into the snapshot of every consumer.
   */
  @Input() detachedPopup: boolean | undefined;
  /** Accessible name of the per-option edit action; the rows that opt into it carry only an icon. */
  @Input() editActionLabel: string | null = null;
  @Input() error = false;
  @Input() errorMessage: string | null = null;
  @Input() fieldLabel: string | undefined = undefined;
  @Input() fieldLabelTooltip: string | null = null;
  /**
   * Marks a typeahead opened from an Ignite dialog. Requires `container="body"` (the dialog shell
   * scrolls, so an inline popup would be clipped) and adapts the body-attached popup to it: raised
   * above the dialog's CDK overlay and sized to the field (see the `--in-dialog` styles and
   * `withSameWidth`). Opt-in, so body-attached popups on plain pages keep their historical
   * content-based width and stacking.
   */
  @Input() isInDialog = false;
  /**
   * Whether clicking the field lists every option, as a select does. Off, the field behaves as a search: options
   * appear only for what the user types (an autocomplete over a list too long to browse), it shows no chevron, and
   * the typed text is a search term, so no option is marked as selected because of it.
   */
  readonly openOnClick = input(true, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });

  /**
   * Keeps a detached popup on the right side of an on-screen keyboard.
   *
   * `NgbTypeahead` repositions its popup from an `afterEveryRender` hook, so every Angular render
   * while the popup is open is already a reposition. What is missing on a touch device is the
   * render: raising the keyboard shrinks the *visual* viewport only, and neither Angular nor
   * Popper's own `eventListeners` modifier — it subscribes to `window`'s `resize` and to the scroll
   * parents, nothing else — hears about that. The popup therefore keeps the placement it was given
   * against the full-height viewport, which is the one the keyboard then covers.
   *
   * Popper already measures the right box: `getViewportRect` reads `visualViewport.width/height`,
   * and under `strategy: 'fixed'` — the strategy `detachedPopup` selects — it also applies its
   * offsets. So one render is all it takes for the flip and `withViewportMaxHeight` to see the space
   * the keyboard actually left.
   */
  constructor() {
    super();
    const viewport: VisualViewport | null | undefined = globalThis.visualViewport;
    if (viewport === undefined || viewport === null) {
      return;
    }

    merge(fromEvent(viewport, 'resize'), fromEvent(viewport, 'scroll'))
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#repositionDetachedPopup());
  }

  override getOptionClass(option: SelectDropdownPlanOption | SelectOption): string {
    const optionClass = super.getOptionClass(option);
    if (this.openOnClick() || typeof this.model !== 'string') {
      return optionClass;
    }
    return optionClass
      .split(' ')
      .filter(className => className !== IgntTypeaheadComponent.selectedOptionClass)
      .join(' ');
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    fromEvent<KeyboardEvent>(this.inputTypeahead.nativeElement, 'keydown', { capture: true })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((event: KeyboardEvent) => this.#moveFocusToActiveEditAction(event));
  }

  /** The native `readonly` attribute blocks typing, not clicks or arrow keys, so the dropdown is refused here. */
  override onClickInput(): void {
    if (this.readonly()) {
      return;
    }
    if (!this.openOnClick()) {
      this.inputTypeahead.nativeElement.select();
      return;
    }

    super.onClickInput();
  }

  override onEnter(event: KeyboardEvent): void {
    if (this.readonly()) {
      return;
    }

    super.onEnter(event);
  }

  /**
   * A body-attached popup is not a descendant of the field, so the `width: 100%` the inline popups
   * rely on cannot reach it — the positioner syncs the width instead, keeping both flavours the same
   * width as their field.
   *
   * `strategy: 'fixed'` is applied whenever `isInDialog` because CDK's `BlockScrollStrategy` — the
   * Ignite dialog default — locks scrolling by setting `<html>` to `position: fixed; top: -scrollY`,
   * which resets `window.scrollY` to 0. Popper.js adds `scrollY` when computing `position: absolute`
   * coordinates, so with BlockScrollStrategy active the popup undershoots by the original scroll
   * offset and lands off-screen. Fixed positioning bypasses `scrollY` and places the popup directly
   * in viewport coordinates, matching the dialog's own fixed stacking context.
   */
  protected readonly popperOptions = (options: Partial<Options>): Partial<Options> => {
    if (this.detachedPopup === true) {
      return { ...withViewportMaxHeight(withSameWidth(options)), strategy: 'fixed' };
    }
    if (this.container !== 'body' || !this.isInDialog) return options;
    return { ...withSameWidth(options), strategy: 'fixed' };
  };

  /** A search lists nothing on an arrow key: arrows only move through the suggestions of what was typed. */
  override onPressArrow(event: KeyboardEvent): void {
    if (this.readonly() || (!this.openOnClick() && !this.boostrapTypeaheadInstance.isPopupOpen())) {
      return;
    }

    super.onPressArrow(event);
  }

  /** `detachedPopup` implies a body-attached popup; see the input. */
  protected get effectiveContainer(): 'body' | null {
    return this.detachedPopup === true ? 'body' : this.container;
  }

  protected onEditActionEscape(event: Event): void {
    event.preventDefault();
    this.inputTypeahead.nativeElement.focus();
  }

  /** The `--in-dialog` popup class carries the dialog adaptations; see `isInDialog`. */
  protected get popupClass(): string {
    if (this.detachedPopup === true) {
      return 'field-dropdown field-dropdown--in-body field-dropdown--detached';
    }
    if (this.container !== 'body') {
      return 'field-dropdown';
    }

    return this.isInDialog ? 'field-dropdown field-dropdown--in-body field-dropdown--in-dialog' : 'field-dropdown field-dropdown--in-body';
  }

  #moveFocusToActiveEditAction(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || event.shiftKey) {
      return;
    }

    const activeOptionId = this.inputTypeahead.nativeElement.getAttribute('aria-activedescendant');
    const editAction =
      activeOptionId === null ? null : this.#document.getElementById(activeOptionId)?.querySelector('[data-testid="dropdown-item-edit"]');

    if (!(editAction instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    editAction.focus();
  }

  #repositionDetachedPopup(): void {
    if (this.detachedPopup !== true || !this.boostrapTypeaheadInstance?.isPopupOpen()) {
      return;
    }
    this.#changeDetectorRef.markForCheck();
  }
}
