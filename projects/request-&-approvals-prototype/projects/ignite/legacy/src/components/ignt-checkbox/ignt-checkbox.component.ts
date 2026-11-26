import { NgIf } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { IconsModule } from '@fz-original/app/shared/icons/icons.module';

@Component({
  selector: 'ignt-checkbox',
  templateUrl: './ignt-checkbox.component.html',
  styleUrls: ['./ignt-checkbox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [NgIf, IconsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: IgntCheckboxComponent,
      multi: true,
    },
  ],
})
export class IgntCheckboxComponent implements AfterViewInit, ControlValueAccessor {
  static checkboxCount = 0;

  private cdr = inject(ChangeDetectorRef);
  // Angular rejects signal queries on ES-private fields, so this one keeps the TS modifier the rest
  // of the class's injected members use.
  private readonly projectedContent = viewChild<ElementRef<HTMLElement>>('projectedContent');
  // Projected content is read from the DOM once the view exists, so it cannot be part of the
  // keyboardFocusable expression directly. Call sites project static text, so reading it once is
  // enough; a checkbox given no label, no description and nothing to project stays out of the tab
  // order, having nothing to announce.
  #hasProjectedContent = false;
  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};
  @Output() change = new EventEmitter<boolean>();
  // For a checkbox that renders nothing readable — no label, no description, nothing projected,
  // such as a row-selection checkbox in a table. Without it the input would be announced as a bare
  // "checkbox", so it stays out of the tab order until a call site names it.
  @Input() ariaLabel: string | null = null;
  @Input() checked = false;
  @Input() dataTestId = '';
  @Input() description: string | null = null;
  @Input() disabled = false;
  @Input() errorMessage = '';
  @Input() hasError = false;
  @Input() id = `checkbox-${IgntCheckboxComponent.checkboxCount++}`;
  @Input() label = '';
  @Input() size: 'base' | 'small' = 'base';
  @Input() tooltip: string | null = null;

  ngAfterViewInit(): void {
    const projected = this.projectedContent()?.nativeElement;
    // textContent rather than childNodes: an *ngIf that projected nothing still leaves comment
    // anchors behind, and a comment names nothing.
    this.#hasProjectedContent = (projected?.textContent ?? '').trim().length > 0;
    if (this.#hasProjectedContent) {
      // The tabindex binding has already been rendered as -1 by now, so re-check this view rather
      // than only marking it: the value has to settle before the checkNoChanges pass sees it.
      this.cdr.detectChanges();
    }
  }

  onLabelClick(event: Event): void {
    if (this.disabled) {
      event.preventDefault();
      return;
    }

    event.preventDefault(); // Prevent default label behavior

    // Toggle the state
    this.checked = !this.checked;

    // Update form control and emit events
    this.onChange(this.checked);
    this.onTouched();
    this.change.emit(this.checked);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // ControlValueAccessor implementation
  writeValue(value: boolean): void {
    this.checked = !!value;
    this.cdr.markForCheck();
  }

  // The accessible name comes from the wrapping <label>'s text content — which projected content
  // contributes to just as much as [label] does, so a checkbox that projects text is named and
  // belongs in the tab order. Only one that renders nothing readable stays out of it.
  protected get keyboardFocusable(): boolean {
    return Boolean(this.label || this.description || this.ariaLabel || this.#hasProjectedContent);
  }
}
