import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  forwardRef,
  inject,
  input,
  Input,
  OnChanges,
  SimpleChanges,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { IgntRadioGroupComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio-group.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

import { RequestGeneralReview } from '../../models/post-purchase-section.enum';
import { PostPurchaseSectionConfig } from '../../models/settings-configs.model';

@Component({
  selector: 'app-post-purchase-section',
  templateUrl: './post-purchase-section.component.html',
  styleUrls: ['./post-purchase-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IgntRadioComponent, IgntRadioGroupComponent, IgntWrapperCardComponent, ReactiveFormsModule, TranslateModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PostPurchaseSectionComponent),
      multi: true,
    },
  ],
})
export class PostPurchaseSectionComponent implements ControlValueAccessor, OnChanges {
  #destroyRef = inject(DestroyRef);
  #isDisabled = false;
  #onChange = (_value: RequestGeneralReview) => {};
  #onTouched = () => {};

  get canEditRequestGeneralReview(): boolean {
    return this.config?.requestGeneralReview.editable ?? true;
  }
  get isDisabled(): boolean {
    return this.#isDisabled || !this.canEditRequestGeneralReview || !this.canEditPlan();
  }

  readonly canEditPlan = input<boolean>(true);
  @Input() config: PostPurchaseSectionConfig | null = null;

  radioGroupControl = new FormControl<RequestGeneralReview>(RequestGeneralReview.Yes);

  // eslint-disable-next-line perfectionist/sort-classes
  readonly requestGeneralReview = RequestGeneralReview;

  constructor() {
    effect(() => {
      this.canEditPlan();
      untracked(() => {
        this.#updateFieldState();
      });
    });

    this.radioGroupControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((value: RequestGeneralReview | null) => {
      if (value !== null) {
        this.#onChange(value);
        this.#onTouched();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.#updateFieldState();
    }
  }

  registerOnChange(fn: (value: RequestGeneralReview) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.#isDisabled = isDisabled;
    this.#updateFieldState();
  }

  writeValue(value: RequestGeneralReview): void {
    if (value !== null && value !== undefined) {
      this.radioGroupControl.setValue(value, { emitEvent: false });
    }
    this.#updateFieldState();
  }

  #updateFieldState(): void {
    if (this.isDisabled) {
      this.radioGroupControl.disable({ emitEvent: false });
    } else {
      this.radioGroupControl.enable({ emitEvent: false });
    }
  }
}
