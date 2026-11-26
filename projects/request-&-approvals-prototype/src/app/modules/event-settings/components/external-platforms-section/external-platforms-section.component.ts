import { ChangeDetectionStrategy, Component, EventEmitter, inject, input, Input, Output } from '@angular/core';

import { FeverOnlyMarkerComponent } from '@fz-original/app/shared/components/fever-only-marker/fever-only-marker.component';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

import { ExternalPlatformsSectionConfig } from '../../models/settings-configs.model';
import { isSuperuserOnlyField as isSuperuserOnlyFieldUtil } from '../../utils/is-superuser-only-field.util';

@Component({
  selector: 'app-external-platforms-section',
  templateUrl: './external-platforms-section.component.html',
  styleUrls: ['./external-platforms-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FeverOnlyMarkerComponent, IgntToggleComponent, IgntWrapperCardComponent, TranslateModule],
})
export class ExternalPlatformsSectionComponent {
  readonly #userService = inject(UserService);

  @Input() allowPublishingInOta = false;
  readonly canEditPlan = input<boolean>(true);
  @Output() allowPublishingInOtaChange = new EventEmitter<Event>();
  @Input() config: ExternalPlatformsSectionConfig | null = null;

  get disabled(): boolean {
    return !this.canEditPlan() || !(this.config?.allowPublishingInOta.editable ?? true);
  }

  isSuperuserOnlyField(fieldConfig: Parameters<typeof isSuperuserOnlyFieldUtil>[0], isEditableInUi = true): boolean {
    return isSuperuserOnlyFieldUtil(fieldConfig, this.#userService.getUser()?.isStaff() ?? false, isEditableInUi);
  }

  onAllowPublishingInOtaChange(event: Event): void {
    if (this.disabled) {
      return;
    }
    this.allowPublishingInOtaChange.emit(event);
  }
}
