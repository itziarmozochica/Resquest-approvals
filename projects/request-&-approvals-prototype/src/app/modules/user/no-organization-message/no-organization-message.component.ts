import { ChangeDetectionStrategy, Component, EventEmitter, input, Output } from '@angular/core';

import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { IgntButtonComponent } from '@ignite/common';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-no-organization-message',
  standalone: true,
  templateUrl: './no-organization-message.component.html',
  styleUrls: ['./no-organization-message.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconsModule, IgntWrapperCardComponent, IgntButtonComponent, TranslateModule],
})
export class NoOrganizationMessageComponent {
  readonly belongsToMarketplace = input(false);
  @Output() logoutEmitter = new EventEmitter<void>();
  logout(): void {
    this.logoutEmitter.emit();
  }
}
