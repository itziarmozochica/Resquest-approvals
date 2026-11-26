import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-plan-creation-header',
  standalone: true,
  styleUrls: ['./plan-creation-header.component.scss'],
  templateUrl: './plan-creation-header.component.html',
})
export class PlanCreationHeaderComponent {
  breadcrumbClick = output<void>();
  showBreadcrumb = input<boolean>(false);
  title = input<string | null>(null);
}
