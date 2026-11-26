import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  input,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntIconComponent } from '@ignite/icon';
import { NgbDate, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment-timezone';

import { NgbDateUtil } from '../../utils/ngb-date.util';

let nextCollapsibleId = 0;

@Component({
  selector: 'ignt-date-picker-input',
  templateUrl: './ignt-date-picker-input.component.html',
  styleUrls: ['./ignt-date-picker-input.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgbDatepickerModule, NgClass, NgTemplateOutlet, IgntIconComponent],
})
export class IgntDatePickerInputComponent implements OnChanges {
  #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  get minDateNgb(): NgbDate | null {
    if (!this.minDate) return null;
    if (!this.timezone || this.timezone.trim().length === 0) {
      return NgbDateUtil.fromDate(moment(this.minDate).toDate());
    }
    return NgbDateUtil.fromDate(moment(this.minDate).tz(this.timezone).toDate());
  }
  @Output() changeDate = new EventEmitter<string | null>();
  @Input() class = '';
  readonly collapsibleId = `ignt-date-picker-collapsible-${nextCollapsibleId++}`;
  @ViewChild('datepicker', { read: ElementRef }) datepickerElement!: ElementRef<HTMLElement>;
  disabled = false;
  hasError = input(false);
  /**
   * The calendar is a collapsible under the field instead of an overlay: a tap on the field expands or
   * collapses it in the flow (for a scrolling sheet, where an overlay would end behind the footer).
   */
  inline = input(false);
  @ViewChild('input', { static: true }) inputElement!: ElementRef<HTMLElement>;
  @Input() isOneStopShop = false;
  isOpen = false;
  isTouchDevice: boolean =
    typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints !== undefined && navigator.maxTouchPoints > 0));
  @Input() label = '';

  @Input() minDate: Date | null = null;

  selectedDate: NgbDate | null = null;
  @Input() startDate: string | null = null;
  @Input() timezone = '';

  checkEmptyValue(): void {
    if (this.selectedDate === null) {
      this.changeDate.emit(null);
    }
  }
  close(): void {
    this.isOpen = false;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.startDate === null) return;
    this.selectedDate = this.#toGuardedNgbDate(this.startDate, this.timezone);
  }

  // Only the collapsible's own height transition counts: hover transitions of the day buttons bubble up too.
  onCollapsibleTransitionEnd(event: TransitionEvent): void {
    if (event.target !== event.currentTarget || event.propertyName !== 'grid-template-rows') {
      return;
    }
    this.#scrollCollapsibleIntoView();
  }

  onDateSelect(): void {
    this.isOpen = false;
    const ngbDate = this.selectedDate as NgbDate;
    if (!ngbDate) {
      return;
    }
    const dateString = `${ngbDate.year}-${ngbDate.month}-${ngbDate.day}`;
    const date = moment(dateString, 'YYYY-MM-DD');
    this.changeDate.emit(date.format('YYYY-MM-DD'));
  }

  @HostListener('window:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.#isThisPointInsideTheComponent(event.clientX, event.clientY)) {
      this.close();
    }
  }

  onFieldClick(): void {
    if (this.inline() && this.isOpen) {
      this.close();
      return;
    }
    this.open();
    // With reduced motion the collapsible has no transition to end on, so the scroll follows the next frame.
    if (this.inline() && this.isOpen && this.#prefersReducedMotion()) {
      requestAnimationFrame(() => this.#scrollCollapsibleIntoView());
    }
  }

  open(): void {
    if (this.disabled) {
      return;
    }
    this.isOpen = true;
  }

  #isThisPointInsideTheComponent(x: number, y: number): boolean {
    const target: Element | null = document.elementFromPoint(x, y);
    return this.#elementRef.nativeElement.contains(target);
  }

  #prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  #scrollCollapsibleIntoView(): void {
    const collapsible: HTMLElement | null = this.#elementRef.nativeElement.querySelector('.date-range-picker-collapsible');
    if (this.isOpen && typeof collapsible?.scrollIntoView === 'function') {
      collapsible.scrollIntoView({ behavior: this.#prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  #toGuardedNgbDate(startDate: string | null, timezone: string | null | undefined): NgbDate | null {
    if (startDate === null) return null;
    if (timezone === null || timezone === undefined || timezone.trim().length === 0) return null;
    const date = moment(startDate);
    if (!date.isValid()) return null;
    const zonedDate = date.tz(timezone);
    if (!zonedDate.isValid()) return null;
    return NgbDateUtil.fromDate(zonedDate.toDate());
  }
}
