import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  NgZone,
  OnInit,
  output,
  untracked,
} from '@angular/core';

import { KenBurnsSlide, KenBurnsSlideRole } from './ken-burns-slider.model';

export interface SliderItem {
  alt: string;
  image: string;
}

/**
 * Cross-fades `items` with a slow pan and zoom. Built for the low-end dual-screen terminal, whose second screen shares one
 * renderer process with the POS: only the leaving, the active and the next slide are in the DOM (so only the next image
 * preloads), motion is a compositor-only CSS animation of `transform` and `opacity`, and `paused` freezes both the motion
 * and the rotation.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.kb-slider--paused]': 'paused()' },
  selector: 'app-ken-burns-slider',
  // Declared by SharedComponentsModule, whose suppressed design-system lint debt falls due as soon as the module is edited.
  standalone: false,
  styleUrl: './ken-burns-slider.component.scss',
  templateUrl: './ken-burns-slider.component.html',
})
export class KenBurnsSliderComponent implements OnInit {
  static readonly slideDurationMs = 7000;
  /** Pan end points, cycled per activation; 5% stays inside the 20% zoom margin, so no edge shows. */
  static readonly pans: readonly (readonly [string, string])[] = [
    ['-5%', '-5%'],
    ['5%', '5%'],
    ['5%', '-5%'],
    ['-5%', '5%'],
  ];

  readonly #ngZone = inject(NgZone);
  /** The index last sent through `currentIndexChanged`. */
  #announcedIndex = 0;

  readonly items = input<SliderItem[]>([]);
  /** Freezes the current slide and its motion, e.g. while the main screen of a dual-screen terminal is busy. */
  readonly paused = input(false);

  readonly currentIndexChanged = output<number>();
  readonly imageClicked = output<number>();

  /**
   * How many times the slider advanced: the active slide is `step % items().length`. A list of the same length keeps the
   * step, so the current slide and its motion carry on. A list of another length keeps the active index while it still
   * exists and restarts at the first item when it does not, so a shorter list never leaves a removed slide active.
   */
  readonly #step = linkedSignal<SliderItem[], number>({
    computation: (items, previous) => {
      if (previous === undefined) {
        return 0;
      }
      const previousLength = previous.source.length;
      if (previousLength === items.length) {
        return previous.value;
      }
      const index = previousLength === 0 ? 0 : previous.value % previousLength;
      return index < items.length ? index : 0;
    },
    source: this.items,
  });

  protected readonly slideRole = KenBurnsSlideRole;
  protected readonly currentIndex = computed(() => this.#toIndex(this.#step()));
  protected readonly slides = computed<KenBurnsSlide[]>(() => {
    const items = this.items();
    if (items.length === 0) {
      return [];
    }
    const step = this.#step();
    const steps: [number, KenBurnsSlideRole][] =
      items.length === 1
        ? [[step, KenBurnsSlideRole.Active]]
        : [
            [step - 1, KenBurnsSlideRole.Leaving],
            [step, KenBurnsSlideRole.Active],
            [step + 1, KenBurnsSlideRole.Next],
          ];
    return steps
      .filter(([slideStep]) => slideStep >= 0)
      .map(([slideStep, role]) => {
        const [panX, panY] = KenBurnsSliderComponent.pans[slideStep % KenBurnsSliderComponent.pans.length];
        return { item: items[this.#toIndex(slideStep)], panX, panY, role, step: slideStep };
      });
  });

  constructor() {
    this.#rotateWhileRunning();
    this.#announceIndexMovedByNewItems();
  }

  ngOnInit(): void {
    this.#announceCurrentIndex();
  }

  /** Consumers such as the kiosk track the index, so a new list that resets it is announced too. */
  #announceIndexMovedByNewItems(): void {
    effect(() => {
      this.items();
      untracked(() => {
        if (this.currentIndex() !== this.#announcedIndex) {
          this.#announceCurrentIndex();
        }
      });
    });
  }

  #announceCurrentIndex(): void {
    this.#announcedIndex = this.currentIndex();
    this.currentIndexChanged.emit(this.#announcedIndex);
  }

  #rotateWhileRunning(): void {
    // A boolean, so a new items array of the same size does not restart the timer of the current slide.
    const canRotate = computed(() => !this.paused() && this.items().length > 1);
    effect(onCleanup => {
      if (!canRotate()) {
        return;
      }
      // Signal writes schedule change detection on their own, so the timer does not need to tick the whole app.
      const interval = this.#ngZone.runOutsideAngular(() =>
        setInterval(() => {
          this.#step.update(step => step + 1);
          this.#announceCurrentIndex();
        }, KenBurnsSliderComponent.slideDurationMs),
      );
      onCleanup(() => clearInterval(interval));
    });
  }

  #toIndex(step: number): number {
    const length = this.items().length;
    return length === 0 ? 0 : step % length;
  }
}
