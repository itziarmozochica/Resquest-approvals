import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { LoginFormContainerModule } from '../login-form-container/login-form-container.module';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoginFormContainerModule, TranslateModule],
  selector: 'app-nfc-pin-token-expired',
  styleUrl: '../login-form-container/login-form-container.component.scss',
  templateUrl: './nfc-pin-token-expired.component.html',
})
export class NfcPinTokenExpiredComponent {}
