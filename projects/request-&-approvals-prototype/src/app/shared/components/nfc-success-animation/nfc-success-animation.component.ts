import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { NfcSuccessAnimationDevice } from './nfc-success-animation-device.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-nfc-success-animation',
  standalone: true,
  styleUrls: ['./nfc-success-animation.component.scss'],
  templateUrl: './nfc-success-animation.component.html',
})
export class NfcSuccessAnimationComponent {
  readonly device = input<NfcSuccessAnimationDevice>('dualScreen');
}
