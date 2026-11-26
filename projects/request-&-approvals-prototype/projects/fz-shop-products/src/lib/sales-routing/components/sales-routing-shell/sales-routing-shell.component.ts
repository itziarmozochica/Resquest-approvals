import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { SalesRoutingPageTitleComponent } from '../sales-routing-page-title/sales-routing-page-title.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SalesRoutingPageTitleComponent, TranslateModule],
  selector: 'fz-sales-routing-shell',
  styleUrl: './sales-routing-shell.component.scss',
  templateUrl: './sales-routing-shell.component.html',
})
export class SalesRoutingShellComponent {}
