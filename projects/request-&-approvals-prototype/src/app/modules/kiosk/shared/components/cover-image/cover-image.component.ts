import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { kioskImageMotionScale } from '../../../models/kiosk-image.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cover-image',
  standalone: false,
  styleUrl: './cover-image.component.scss',
  templateUrl: './cover-image.component.html',
})
export class CoverImageComponent {
  @Input() animated = true;
  @Input() image = '';
  readonly motionScale = kioskImageMotionScale;
}
