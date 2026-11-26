import type { SliderItem } from './ken-burns-slider.component';

export enum KenBurnsSlideRole {
  /** Fading out; it leaves the DOM on the next advance. */
  Leaving = 'leaving',
  Active = 'active',
  /** Hidden and preloading its image. */
  Next = 'next',
}

/** One rendered slide. `step` is its activation number, so a slide that comes back is a fresh node and restarts its motion. */
export interface KenBurnsSlide {
  item: SliderItem;
  panX: string;
  panY: string;
  role: KenBurnsSlideRole;
  step: number;
}
