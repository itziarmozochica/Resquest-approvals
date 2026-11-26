import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { AiSparkleIconComponent } from '../ai-sparkle-icon/ai-sparkle-icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AiSparkleIconComponent, TranslateModule],
  selector: 'app-ai-badge',
  standalone: true,
  styleUrl: './ai-badge.component.scss',
  templateUrl: './ai-badge.component.html',
})
export class AiBadgeComponent {}
