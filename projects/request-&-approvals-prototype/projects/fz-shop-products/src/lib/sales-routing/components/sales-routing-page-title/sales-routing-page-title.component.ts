import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

/**
 * The light title of the Sales routings page: the "Shop" section label above the bold page title, and the
 * page actions a container projects on its right (on their own row on mobile).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'fz-sales-routing-page-title',
  styleUrl: './sales-routing-page-title.component.scss',
  templateUrl: './sales-routing-page-title.component.html',
})
export class SalesRoutingPageTitleComponent {}
