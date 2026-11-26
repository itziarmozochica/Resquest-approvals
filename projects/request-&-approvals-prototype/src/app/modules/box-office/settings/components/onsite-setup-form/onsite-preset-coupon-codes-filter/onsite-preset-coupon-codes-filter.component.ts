import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  Signal,
  signal,
  SimpleChanges,
  ViewChild,
  WritableSignal,
} from '@angular/core';

import { TemplateCouponsListResponse } from '@fz-original/app/modules/coupons/services/template-coupon/template-coupon.adapter';
import { TemplateCouponService } from '@fz-original/app/modules/coupons/services/template-coupon/template-coupon.service';
import { MultiSelectComponent } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.component';
import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { FilterSelectModule } from '@fz-original/app/shared/layout/filters/select/select.module';
import { TypeaheadModule } from '@fz-original/app/shared/layout/filters/typeahead/typeahead.module';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable, take } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-onsite-preset-coupon-codes-filter',
  standalone: true,
  imports: [
    NgForOf,
    FilterSelectModule,
    TranslateModule,
    CdkDropList,
    IgntIconComponent,
    CdkDrag,
    CdkDragHandle,
    MultiSelectModule,
    NgIf,
    TypeaheadModule,
    CdkDragPlaceholder,
    AsyncPipe,
  ],
  templateUrl: './onsite-preset-coupon-codes-filter.component.html',
  styleUrls: ['./onsite-preset-coupon-codes-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnsitePresetCouponCodesFilterComponent implements OnChanges {
  static readonly PAGE_SIZE = 50;

  #changeDetectorRef = inject(ChangeDetectorRef);
  #skipNextUpdate = false;
  #templateCouponService = inject(TemplateCouponService);

  customCouponOptions: WritableSignal<SelectOption[]> = signal<SelectOption[]>([]);
  isLoadingTemplateCoupons$ = new BehaviorSubject<boolean>(true);
  @ViewChild('multiSelect') multiSelect!: MultiSelectComponent;
  @Input({ required: true }) presetCouponCodes: string[] = [];
  printableCouponOptions: WritableSignal<SelectOption[]> = signal<SelectOption[]>([]);
  @Output() selected = new EventEmitter<string[]>();
  selectedCoupons: WritableSignal<SelectOption[]> = signal<SelectOption[]>([]);
  showAddCouponSelect: WritableSignal<boolean> = signal<boolean>(false);
  templateCouponOptions: WritableSignal<SelectOption[]> = signal<SelectOption[]>([]);
  templateCouponPage: WritableSignal<number | null> = signal<number | null>(1);
  totalAvailableOptions: Signal<number> = computed<number>(() => this.printableCouponOptions().length + this.customCouponOptions().length);

  deleteCoupon(couponCodeIndex: number): void {
    const newSelectedCoupons: SelectOption[] = this.selectedCoupons();
    newSelectedCoupons.splice(couponCodeIndex, 1);
    this.selectedCoupons.set(newSelectedCoupons);
    this.selected.emit(this.selectedCoupons().map(({ id }) => id));
    this.#updateRemainingCouponOptions();
  }

  dropChangeCoupon({ previousIndex, currentIndex }: CdkDragDrop<string[]>): void {
    moveItemInArray(this.selectedCoupons(), previousIndex, currentIndex);
    this.selected.emit(this.selectedCoupons().map(({ id }) => id));
  }

  forceUpdateList(): void {
    this.#updateRemainingCouponOptions();
    if (this.multiSelect) {
      this.multiSelect.forceConfirmSelection();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.presetCouponCodes) {
      return;
    }

    const presetCodes = changes.presetCouponCodes.currentValue;
    if (!Array.isArray(presetCodes) || this.templateCouponOptions().length) {
      return;
    }

    this.isLoadingTemplateCoupons$
      .pipe(
        finalize(() => {
          this.selectedCoupons.set([]);
          let changedSelectedCoupons: SelectOption[] = [];
          presetCodes.forEach(value => {
            let couponCode = this.templateCouponOptions().find(({ id }) => id === value);
            if (!couponCode) {
              couponCode = { id: value, title: value };
            }
            changedSelectedCoupons = [...changedSelectedCoupons, couponCode];
          });
          this.selectedCoupons.set(changedSelectedCoupons);
          this.#updateRemainingCouponOptions();
          this.#changeDetectorRef.detectChanges();
        }),
      )
      .subscribe();
    this.#loadTemplateCoupons();
  }

  onCustomDeselected(): void {
    this.#skipNextUpdate = true;
  }

  updateCouponSelection(selectedCoupons: SelectOption[] = []): void {
    this.selectedCoupons.set(selectedCoupons);
    this.selected.emit(this.selectedCoupons().map(({ id }) => id));

    if (!this.#skipNextUpdate) {
      this.#updateRemainingCouponOptions();
    }
    this.#skipNextUpdate = false;
  }

  #loadTemplateCoupons(): void {
    this.#loadTemplateCouponsPage(this.templateCouponPage() ?? 1)
      .pipe(take(1))
      .subscribe(couponsResponse => {
        if (couponsResponse.data) {
          this.templateCouponPage.set(couponsResponse.getNextPaginationPage());
          this.templateCouponOptions.set([
            ...this.templateCouponOptions(),
            ...couponsResponse.data.map(({ code, title }) => ({ id: code, title })),
          ]);
        }

        if (this.templateCouponPage() == null) {
          this.isLoadingTemplateCoupons$.next(false);
          this.isLoadingTemplateCoupons$.complete();
          return;
        }

        this.#loadTemplateCoupons();
      });
  }

  #loadTemplateCouponsPage(page: number): Observable<TemplateCouponsListResponse> {
    return this.#templateCouponService.getTemplateCoupons({
      templateCouponType: 'default',
      page,
      pageSize: OnsitePresetCouponCodesFilterComponent.PAGE_SIZE,
    });
  }

  #updateRemainingCouponOptions(): void {
    const templateOptions = this.templateCouponOptions();
    const selectedCoupons = this.selectedCoupons();

    const customOptions = selectedCoupons.filter(
      selectedCoupon => !templateOptions.some(templateOption => templateOption.id === selectedCoupon.id),
    );

    this.printableCouponOptions.set(templateOptions);
    this.customCouponOptions.set(customOptions);
  }
}
