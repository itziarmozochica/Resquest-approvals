import { ChangeDetectionStrategy, Component } from '@angular/core';

import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntSkeletonBaseComponent],
  selector: 'fzt-tile-grid-skeleton',
  styleUrl: './tile-grid-skeleton.component.scss',
  templateUrl: './tile-grid-skeleton.component.html',
})
export class FztTileGridSkeletonComponent {
  protected readonly skeletonTiles: readonly number[] = [1, 2, 3, 4, 5];
}
