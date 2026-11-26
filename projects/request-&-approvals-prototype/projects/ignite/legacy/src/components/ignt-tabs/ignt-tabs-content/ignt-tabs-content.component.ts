import { PortalModule, TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { IgntTabsVariant, IgntTabsVariantET } from '@ignite/legacy/enums/ignt-tabs.enum';

@Component({
  selector: 'ignt-tabs-content',
  templateUrl: './ignt-tabs-content.html',
  styleUrls: ['./ignt-tabs-content.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PortalModule],
})
export class IgntTabsContentComponent {
  @Input()
  content!: TemplatePortal;
  @Input() isActive = false;
  @Input() variant = IgntTabsVariant[IgntTabsVariant.default] as IgntTabsVariantET;
}
