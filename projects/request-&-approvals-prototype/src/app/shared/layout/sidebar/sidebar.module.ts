import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { UserModule } from '@fz-original/app/modules/user/user.module';
import { AiBadgeComponent } from '@fz-original/app/shared/components/ai-badge/ai-badge.component';
import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ClickOutsideModule } from 'ng-click-outside';

import { PermissionBaseModule } from '../../directives/permission-based/permission-base.module';
import { IconsModule } from '../../icons/icons.module';
import { OptimizelyModule } from '../../optimizely/optimizely.module';
import { AffiliateSidebarComponent } from './affiliate-sidebar/affiliate-sidebar.component';
import { MenuItemComponent } from './menu-item/menu-item.component';
import { SidebarComponent } from './sidebar.component';

@NgModule({
  declarations: [SidebarComponent, MenuItemComponent, AffiliateSidebarComponent],
  exports: [SidebarComponent],
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    ClickOutsideModule,
    IconsModule,
    NgbAccordionModule,
    PermissionBaseModule,
    OptimizelyModule,
    UserModule,
    AiBadgeComponent,
  ],
})
export class SidebarModule {}
