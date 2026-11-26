import { NgFor, NgForOf, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { SkeletonAlignmentET, SkeletonTypeET } from '@ignite/legacy/enums/ignt-skeleton.enum';

import { IgntSkeletonBaseComponent } from '../ignt-skeleton-base/ignt-skeleton-base.component';

@Component({
  selector: 'ignt-skeleton',
  templateUrl: './ignt-skeleton.component.html',
  styleUrls: ['./ignt-skeleton.component.scss'],
  standalone: true,
  imports: [NgForOf, NgFor, NgIf, IgntSkeletonBaseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IgntSkeletonComponent {
  @Input() alignment: SkeletonAlignmentET = 'start';
  @Input() animation = false;
  @Input() cardImageOnTop = false;
  @Input() contrast = false;
  @Input() height: number | null = null;
  @Input() isBordered = false;
  @Input() isCardSubtitleVisible = false;
  @Input() isCardTitleVisible = false;
  @Input() numElements = 1;
  @Input() type: SkeletonTypeET = 'paragraph';
}
