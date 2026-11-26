import { NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

import { getBookingQuestionControlId } from '@fz-original/app/shared/utils/booking-questions.utils';
import { catchError, debounceTime, distinctUntilChanged, finalize, mergeWith, of, Subject, switchMap, takeUntil, tap } from 'rxjs';

import { AddressLookupService } from '../../../../services/booking-questions/address-lookup.service';
import { AddressLookupSuggestion, BookingQuestion } from '../../../models';
import { BuildBookingQuestionIdPipe } from '../../../pipes/build-booking-question-id.pipe';
import { FormControlModule } from '../../form-control/form-control.module';
import { QuestionItemModule } from '../question-item.module';

@Component({
  selector: 'fzo-address-lookup-composite-question-item',
  templateUrl: './address-lookup-composite-question-item.component.html',
  styleUrls: ['./address-lookup-composite-question-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [FormControlModule, QuestionItemModule, NgIf, BuildBookingQuestionIdPipe, NgFor],
  standalone: true,
})
export class AddressLookupCompositeQuestionItemComponent implements OnInit, OnDestroy {
  #addressLookupService = inject(AddressLookupService);
  #cdr = inject(ChangeDetectorRef);
  #destroy$ = new Subject<void>();
  #elementRef = inject(ElementRef);

  activeSuggestionIndex = -1;
  addressInputQuestion: BookingQuestion | null = null;
  addressSuggestions: AddressLookupSuggestion[] = [];
  containerSuggestionSelected = new Subject<AddressLookupSuggestion | null>();
  @Input() error = false;
  @Input() formGroup!: UntypedFormGroup;
  ignoreNextValueChange = false;
  isUserTyping = false;
  @Input() questions: BookingQuestion[] = [];
  showSuggestions = false;
  zipCodeInputQuestion: BookingQuestion | null = null;

  ngOnDestroy(): void {
    this.#destroy$.next();
    this.#destroy$.complete();
  }

  ngOnInit(): void {
    if (this.questions && this.questions.length >= 2) {
      this.addressInputQuestion = this.questions[0];
      this.zipCodeInputQuestion = this.questions[1];
    }

    this.#setupAddressControlSubscription();
  }

  onAddressBlur(): void {
    setTimeout(() => {
      this.#hideSuggestions();
    }, 200);
  }

  onAddressFocus(): void {
    if (!this.addressInputQuestion) {
      return;
    }
    const currentValue = this.formGroup.get(
      getBookingQuestionControlId({ questionId: this.addressInputQuestion.id, sessionTypeId: this.addressInputQuestion.sessionTypeId }),
    )?.value;
    if (currentValue && currentValue.length >= 3 && this.addressSuggestions.length > 0) {
      this.showSuggestions = true;
      this.#cdr.detectChanges();
    }
  }

  onAddressInput(_: Event): void {
    this.isUserTyping = true;
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.showSuggestions || this.addressSuggestions.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeSuggestionIndex = Math.min(this.activeSuggestionIndex + 1, this.addressSuggestions.length - 1);
        this.#scrollToActiveItem();
        this.#cdr.detectChanges();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.activeSuggestionIndex = Math.max(this.activeSuggestionIndex - 1, -1);
        this.#scrollToActiveItem();
        this.#cdr.detectChanges();
        break;

      case 'Enter':
        event.preventDefault();
        if (this.activeSuggestionIndex >= 0) {
          this.selectSuggestion(this.addressSuggestions[this.activeSuggestionIndex], this.activeSuggestionIndex);
        }
        break;

      case 'Escape':
        this.#hideSuggestions();
        break;
    }
  }

  selectSuggestion(suggestion: AddressLookupSuggestion, _: number): void {
    if (!this.addressInputQuestion) {
      return;
    }
    if (suggestion.type === 'container') {
      this.containerSuggestionSelected.next(suggestion);
      return;
    }
    const addressControl = this.formGroup.get(
      getBookingQuestionControlId({ questionId: this.addressInputQuestion.id, sessionTypeId: this.addressInputQuestion.sessionTypeId }),
    );
    if (addressControl) {
      this.ignoreNextValueChange = true;
      this.isUserTyping = false;

      addressControl.setValue(suggestion.address);
      addressControl.markAsTouched();
    }

    this.#addressLookupService
      .getAddress(suggestion.id)
      .pipe(
        takeUntil(this.#destroy$),
        catchError((_: unknown) => {
          return of(null);
        }),
      )
      .subscribe(details => {
        if (details && this.zipCodeInputQuestion) {
          const zipCodeControl = this.formGroup.get(
            getBookingQuestionControlId({
              questionId: this.zipCodeInputQuestion.id,
              sessionTypeId: this.zipCodeInputQuestion.sessionTypeId,
            }),
          );
          if (zipCodeControl) {
            zipCodeControl.setValue(details.zipCode);
            zipCodeControl.markAsTouched();
          }
        }
      });

    this.addressSuggestions = [];
    this.#hideSuggestions();
    this.activeSuggestionIndex = -1;
    this.#cdr.detectChanges();
  }

  setActiveSuggestion(index: number): void {
    this.activeSuggestionIndex = index;
  }

  trackByQuestionId(_: number, question: BookingQuestion): string {
    return question.id;
  }

  trackBySuggestion(_: number, suggestion: AddressLookupSuggestion): string {
    return suggestion.id;
  }

  #hideSuggestions(): void {
    this.showSuggestions = false;
    this.activeSuggestionIndex = -1;
    this.isUserTyping = false;
    this.#cdr.detectChanges();
  }

  #scrollToActiveItem(): void {
    const activeIndex = this.activeSuggestionIndex;
    if (activeIndex >= 0) {
      const nativeElement: Element = this.#elementRef.nativeElement as Element;
      const listElement: Element | null = nativeElement.querySelector('.address-suggestions-dropdown__list');
      const activeItem: Element | null = nativeElement.querySelectorAll('.suggestion-item')[activeIndex];

      if (listElement && activeItem) {
        const listRect = listElement.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();

        if (itemRect.bottom > listRect.bottom) {
          listElement.scrollTop += itemRect.bottom - listRect.bottom;
        } else if (itemRect.top < listRect.top) {
          listElement.scrollTop -= listRect.top - itemRect.top;
        }
      }
    }
  }

  #setupAddressControlSubscription(): void {
    if (!this.addressInputQuestion) {
      return;
    }
    const addressControl = this.formGroup.get(
      getBookingQuestionControlId({ questionId: this.addressInputQuestion.id, sessionTypeId: this.addressInputQuestion.sessionTypeId }),
    );
    if (addressControl) {
      addressControl.valueChanges
        .pipe(
          mergeWith(this.containerSuggestionSelected),
          debounceTime(350),
          distinctUntilChanged(),
          tap(() => (this.isUserTyping = true)),
          switchMap((value: string | AddressLookupSuggestion) => {
            let addressToLookup = '';
            let containerId: string | null = null;
            if (typeof value === 'string') {
              addressToLookup = value;
            } else if (value && typeof value === 'object') {
              addressToLookup = value.address;
              containerId = value.id;
            }

            if (this.ignoreNextValueChange) {
              this.ignoreNextValueChange = false;
              this.isUserTyping = false;
              return of(null);
            }

            if (!containerId && (!addressToLookup || addressToLookup.trim() === '' || addressToLookup.length < 3)) {
              this.addressSuggestions = [];
              this.showSuggestions = false;
              this.isUserTyping = false;
              this.#cdr.detectChanges();
              return of(null);
            }

            if (!containerId && !this.isUserTyping) {
              this.isUserTyping = false;
              return of(null);
            }

            return this.#addressLookupService.getSuggestions(addressToLookup, containerId).pipe(
              finalize(() => {
                this.isUserTyping = false;
                this.#cdr.detectChanges();
              }),
              catchError(() => {
                return of([]);
              }),
            );
          }),
          takeUntil(this.#destroy$),
        )
        .subscribe({
          next: (suggestions: AddressLookupSuggestion[] | null) => {
            if (suggestions) {
              this.addressSuggestions = suggestions;
              this.showSuggestions = suggestions.length > 0;
              this.activeSuggestionIndex = -1;
              this.#cdr.detectChanges();
            }
          },
        });
    }
  }
}
