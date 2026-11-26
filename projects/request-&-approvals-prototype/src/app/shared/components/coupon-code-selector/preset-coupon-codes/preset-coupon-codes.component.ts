import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { PresetCoupon } from '@fz-original/app/modules/box-office/shared/models/preset-coupon';
import { CouponCardEvent } from '@fz-original/app/shared/components/coupon-card/coupon-card-event';
import { CouponCardComponent } from '@fz-original/app/shared/components/coupon-card/coupon-card.component';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { IgntAlertComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'preset-coupon-codes',
  },
  imports: [
    AsyncPipe,
    CouponCardComponent,
    IgntAlertComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    PipesModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-preset-coupon-codes',
  standalone: true,
  styleUrl: './preset-coupon-codes.component.scss',
  templateUrl: './preset-coupon-codes.component.html',
})
export class PresetCouponCodesComponent implements OnInit {
  readonly #IS_TYPING_TIMEOUT = 500;
  readonly #destroyRef = inject(DestroyRef);
  readonly MAX_PRESET_COUPONS_SHOW = 9;
  error = input<BehaviorSubject<Error | null>>(new BehaviorSubject<Error | null>(null));
  presetCoupons = input<PresetCoupon[]>([]);
  couponCode = output<string>();
  searchInteraction = output<void>();
  errorDismissed = signal(false);
  isLoading: WritableSignal<boolean> = signal<boolean>(false);
  lastCouponCodeApplied: string | null = null;
  presetCouponsFiltered: WritableSignal<PresetCoupon[]> = signal<PresetCoupon[]>([]);
  searchFormControl = new FormControl('', { nonNullable: true });
  showSearchBar = computed(() => this.presetCoupons().length > this.MAX_PRESET_COUPONS_SHOW);

  constructor() {
    effect(() => {
      this.presetCoupons();
      this.#filterPresetCouponsBySearchTerm(this.searchFormControl.value);
    });
  }

  clearSearch(): void {
    this.searchFormControl.setValue('');
    this.#filterPresetCouponsBySearchTerm('');
  }

  couponCardClicked({ code }: CouponCardEvent): void {
    this.isLoading.set(true);
    this.lastCouponCodeApplied = code;
    this.couponCode.emit(code ?? '');
  }

  ngOnInit(): void {
    this.error()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((error: Error | null) => {
        if (error) {
          this.errorDismissed.set(false);
          this.isLoading.set(false);
        }
      });

    this.searchFormControl.valueChanges
      .pipe(debounceTime(this.#IS_TYPING_TIMEOUT), distinctUntilChanged(), takeUntilDestroyed(this.#destroyRef))
      .subscribe((inputValue: string) => {
        this.#filterPresetCouponsBySearchTerm(inputValue);
        if (inputValue.trim().length > 0) {
          this.searchInteraction.emit();
        }
      });
  }

  #filterPresetCouponsBySearchTerm(searchTerm: string): void {
    if (!this.showSearchBar()) {
      this.presetCouponsFiltered.set(this.presetCoupons());
      return;
    }

    const searchTermLowerCase = searchTerm.toLowerCase();
    const optionsFiltered: PresetCoupon[] = [];

    this.presetCoupons().forEach(option => {
      const titleLowerCase = option.title.toLowerCase();
      const codeLowerCase = option.code.toLowerCase();
      if (titleLowerCase.includes(searchTermLowerCase) || codeLowerCase.includes(searchTermLowerCase)) {
        optionsFiltered.push(option);
      }
    });
    this.presetCouponsFiltered.set(optionsFiltered);
  }
}
