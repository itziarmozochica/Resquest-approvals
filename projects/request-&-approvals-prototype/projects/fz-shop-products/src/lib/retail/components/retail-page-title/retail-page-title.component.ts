import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

/**
 * The light title of the Catalog integrations page: the "Shop" section label above the bold page title, and the
 * page actions a container projects on its right (on their own row on mobile).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'fz-retail-page-title',
  styleUrl: './retail-page-title.component.scss',
  templateUrl: './retail-page-title.component.html',
})
export class RetailPageTitleComponent {}
