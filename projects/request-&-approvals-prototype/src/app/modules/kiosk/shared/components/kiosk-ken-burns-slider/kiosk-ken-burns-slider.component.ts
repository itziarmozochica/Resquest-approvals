import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { SliderItem } from '@fz-original/app/shared/components/sliders/ken-burns-slider/ken-burns-slider.component';

import { KioskImageBox, kioskImageMotionScale } from '../../../models/kiosk-image.model';
import { KioskImageService } from '../../services/kiosk-image.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-kiosk-ken-burns-slider',
  standalone: false,
  styleUrl: './kiosk-ken-burns-slider.component.scss',
  templateUrl: './kiosk-ken-burns-slider.component.html',
})
export class KioskKenBurnsSliderComponent implements AfterViewInit {
  readonly #destroyRef = inject(DestroyRef);
  readonly #kioskImageService = inject(KioskImageService);
  readonly #cssBox = signal<KioskImageBox | null>(null);
  protected readonly sliderWrapper = viewChild.required<ElementRef<HTMLElement>>('sliderWrapper');

  readonly carouselImages = input<string[] | undefined>();
  readonly plans = input<KioskPlanItem[]>([]);
  readonly planClicked = output<number>();

  readonly currentIndex = signal(0);

  readonly sliderItems = computed<SliderItem[]>(() => {
    const carouselImages = this.carouselImages() ?? [];
    const plans = this.plans();
    const cssBox = this.#cssBox();

    if (carouselImages.length > 0) {
      const fallbackAlt = plans[0]?.name ?? '';

      return carouselImages.map((image: string, index: number) => ({
        alt: plans[index]?.name ?? fallbackAlt,
        image: this.#fitImage(image, cssBox),
      }));
    }

    return plans.map((plan: KioskPlanItem) => ({
      alt: plan.name,
      image: this.#fitImage(plan.kiosk_cover_image ?? plan.cover_image, cssBox),
    }));
  });

  readonly isCurrentPlanSoldOut = computed<boolean>(() => {
    const currentPlan = this.#currentPlan();
    return currentPlan ? this.isPlanSoldOut(currentPlan) : false;
  });

  readonly #currentPlan = computed<KioskPlanItem | null>(() => {
    const plans = this.plans();
    const currentIndex = this.currentIndex();
    if ((this.carouselImages()?.length ?? 0) > 0) {
      return plans[currentIndex] ?? plans[0] ?? null;
    }

    return plans[currentIndex] ?? null;
  });

  getCurrentPlan(): KioskPlanItem | null {
    return this.#currentPlan();
  }

  isPlanSoldOut(plan: KioskPlanItem): boolean {
    return !plan.is_purchasable;
  }

  ngAfterViewInit(): void {
    this.#measure();
  }

  onCurrentIndexChanged(index: number): void {
    this.currentIndex.set(index);
  }

  onImageClicked(index: number): void {
    this.currentIndex.set(index);
    this.planClicked.emit(index);
  }

  #fitImage(url: string, cssBox: KioskImageBox | null): string {
    if (cssBox === null) {
      return url;
    }
    return this.#kioskImageService.fit(url, cssBox.widthPx, cssBox.heightPx, kioskImageMotionScale);
  }

  #measure(): void {
    const wrapper = this.sliderWrapper().nativeElement;
    this.#setBox(wrapper.getBoundingClientRect());
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const rect = entries[0]?.contentRect;
      if (rect !== undefined) {
        this.#setBox(rect);
      }
    });
    resizeObserver.observe(wrapper);
    this.#destroyRef.onDestroy(() => resizeObserver.disconnect());
  }

  #setBox(rect: Pick<DOMRectReadOnly, 'height' | 'width'>): void {
    const cssBox = rect.width > 0 && rect.height > 0 ? { heightPx: rect.height, widthPx: rect.width } : null;
    const current = this.#cssBox();
    if (cssBox?.widthPx === current?.widthPx && cssBox?.heightPx === current?.heightPx) {
      return;
    }
    this.#cssBox.set(cssBox);
  }
}
