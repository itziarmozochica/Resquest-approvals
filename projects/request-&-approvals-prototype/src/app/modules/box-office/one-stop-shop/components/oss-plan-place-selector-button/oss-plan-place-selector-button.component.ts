import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';

import { fadeAnimation } from '@fz-original/app/shared/animations/fade.animation';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  animations: [fadeAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconsModule, TranslateModule],
  selector: 'app-oss-plan-place-selector-button',
  standalone: true,
  styleUrls: ['./oss-plan-place-selector-button.component.scss'],
  templateUrl: './oss-plan-place-selector-button.component.html',
})
export class OssPlanPlaceSelectorButtonComponent {
  @Input({ required: true }) set planName(name: string | null) {
    this.isLoading.set(!!name && name.length > 0);
    this.plan.set(name);
  }
  isLoading: WritableSignal<boolean> = signal<boolean>(true);
  plan: WritableSignal<string> = signal<string>(null);
  @Output() selectPlan = new EventEmitter<void>();
}
