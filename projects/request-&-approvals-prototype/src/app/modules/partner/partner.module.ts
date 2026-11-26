import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntMenuComponent, IgntMenuItemComponent, IgntMenuTriggerForDirective } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { UserInfoComponent } from '../../shared/components/user-info/user-info.component';
import { IconsModule } from '../../shared/icons/icons.module';
import { MenuActionsComponent } from './menu-actions/menu-actions.component';
import { PartnerRoutingModule } from './partner-routing.module';

@NgModule({
  declarations: [MenuActionsComponent],
  exports: [MenuActionsComponent],
  imports: [
    CommonModule,
    PartnerRoutingModule,
    FormsModule,
    TranslateModule,
    IconsModule,
    UserInfoComponent,
    IgntIconComponent,
    IgntMenuComponent,
    IgntMenuItemComponent,
    IgntMenuTriggerForDirective,
  ],
})
export class PartnerModule {}
