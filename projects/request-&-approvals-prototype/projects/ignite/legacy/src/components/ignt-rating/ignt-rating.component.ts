import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { SizeProp } from '@fortawesome/fontawesome-svg-core';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';

@Component({
  selector: 'ignt-rating',
  standalone: true,
  imports: [NgFor, NgIf, IconsModule],
  templateUrl: './ignt-rating.component.html',
  styleUrls: ['./ignt-rating.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IgntRatingComponent {
  get iconSize(): SizeProp | undefined {
    switch (this.size) {
      case 'base':
        return 'lg';
      case 'caption':
        return 'sm';
      default:
        return undefined;
    }
  }

  @Input()
  get score(): number {
    return this._score;
  }
  set score(value: number) {
    this._score = value;
    this.updateRatingValues();
  }
  @Input() contrast = false;
  emptyStars: number[] = [];
  fullStars: number[] = [];
  halfStar = false;
  maxRating = 5;
  @Input() ratingsCount = 0;
  @Input() realValuation = true;
  @Input() reviewsAmount = true;
  @Input() showFive = true;
  @Input() size: 'base' | 'small' | 'caption' = 'base';
  @Input() variant: 'full' | 'short' = 'full';
  private _score = 0;

  trackByIndex(index: number): number {
    return index;
  }

  private updateRatingValues(): void {
    const cappedRating = Math.min(this.score, this.maxRating);
    this.fullStars = new Array(Math.floor(cappedRating));
    this.halfStar = cappedRating % 1 !== 0;
    this.emptyStars = new Array(5 - Math.ceil(cappedRating));
  }
}
