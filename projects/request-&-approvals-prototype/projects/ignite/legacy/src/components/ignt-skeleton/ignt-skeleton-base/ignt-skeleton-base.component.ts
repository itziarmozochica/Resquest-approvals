import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { SkeletonAlignmentET } from '../../../enums/ignt-skeleton.enum';

@Component({
  selector: 'ignt-skeleton-base',
  templateUrl: './ignt-skeleton-base.component.html',
  styleUrls: ['./ignt-skeleton-base.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IgntSkeletonBaseComponent {
  #height = 100;
  get height(): number {
    return this.#height;
  }
  @Input() set height(value: number | null) {
    if (value !== null) {
      this.#height = value;
    }
  }

  @Input() alignment: SkeletonAlignmentET = 'start';
  @Input() animation = false;
  @Input() contrast = false;
  @Input() white = false;
  @Input() width = '100%';
}
