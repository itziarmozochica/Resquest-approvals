import { DialogModule } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { OssMobileShiftComponent } from '@fz-original/app/modules/box-office/one-stop-shop/components/oss-shift-mobile/oss-mobile-shift.component';
import { FzAssistantTopBarEntryComponent } from '@fz-original/app/modules/reports/fz-assistant-view/components/fz-assistant-top-bar-entry/fz-assistant-top-bar-entry.component';
import { AiSparkleIconComponent } from '@fz-original/app/shared/components/ai-sparkle-icon/ai-sparkle-icon.component';
import { PermissionBaseModule } from '@fz-original/app/shared/directives/permission-based/permission-base.module';
import { TranslateModule } from '@ngx-translate/core';

import { ContactSupportBannerComponent } from './contact-support-banner/contact-support-banner.component';
import { FooterModule } from './footer/footer.module';
import { FzAssistantDockLazyHostComponent } from './fz-assistant-dock-lazy-host/fz-assistant-dock-lazy-host.component';
import { HeaderComponent } from './header/header.component';
import { ImpersonationBannerComponent } from './impersonation-banner/impersonation-banner.component';
import { LayoutComponent } from './layout.component';
import { MenuBottomSheetComponent } from './menu-bottom-sheet/menu-bottom-sheet.component';
import { MfaSetupRequiredBannerComponent } from './mfa-setup-required-banner/mfa-setup-required-banner.component';
import { SidebarModule } from './sidebar/sidebar.module';
import { WhatsappPopupModule } from './whatsapp-popup/whatsapp-popup.module';

@NgModule({
  declarations: [LayoutComponent],
  exports: [LayoutComponent],
  imports: [
    AiSparkleIconComponent,
    CommonModule,
    ContactSupportBannerComponent,
    DialogModule,
    FooterModule,
    FzAssistantDockLazyHostComponent,
    FzAssistantTopBarEntryComponent,
    HeaderComponent,
    ImpersonationBannerComponent,
    MenuBottomSheetComponent,
    MfaSetupRequiredBannerComponent,
    PermissionBaseModule,
    RouterModule,
    SidebarModule,
    TranslateModule,
    WhatsappPopupModule,
    OssMobileShiftComponent,
  ],
})
export class LayoutModule {}
