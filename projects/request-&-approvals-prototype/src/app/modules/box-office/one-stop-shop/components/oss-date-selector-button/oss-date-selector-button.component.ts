import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';

import { OssMomentDatePipe } from '@fz-original/app/modules/box-office/one-stop-shop/pipes/oss-moment-date.pipe';
import { fadeAnimation } from '@fz-original/app/shared/animations/fade.animation';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  animations: [fadeAnimation],
  selector: 'app-oss-date-selector-button',
  standalone: true,
  imports: [IconsModule, TranslateModule, OssMomentDatePipe],
  templateUrl: './oss-date-selector-button.component.html',
  styleUrls: ['./oss-date-selector-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OssDateSelectorButtonComponent {
  @Input({ required: true }) set datetime(date: string | null) {
    this.isLoading.set(!!date && date.length > 0);
    this.displayDateTime.set(date);
  }
  @Output() changeDate = new EventEmitter<void>();
  displayDateTime: WritableSignal<string> = signal<string>(null);
  isLoading: WritableSignal<boolean> = signal<boolean>(true);
  @Input({ required: true }) locale = '';
  @Input({ required: true }) timezone = '';
}
