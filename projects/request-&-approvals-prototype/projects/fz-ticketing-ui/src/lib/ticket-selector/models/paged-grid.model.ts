import type { ElementRef, Signal } from '@angular/core';

export interface FztPagedChildBox {
  readonly height: number;
  readonly offsetTop: number;
}

export interface FztPageGeometry {
  readonly children: readonly FztPagedChildBox[];
  readonly containerHeight: number;
}

export interface FztPotentialTap {
  readonly key: string;
  readonly startTime: number;
  readonly startX: number;
  readonly startY: number;
}

export interface FztPagedGridSource {
  readonly childKeys: Signal<readonly string[]>;
  readonly content: Signal<unknown>;
  readonly isCompact: Signal<boolean>;
  readonly navigationKey: Signal<string>;
  readonly slidesWrapper: Signal<ElementRef<HTMLElement> | undefined>;
  readonly viewport: Signal<ElementRef<HTMLElement> | undefined>;
  readonly childTapped?: (key: string) => void;
}
