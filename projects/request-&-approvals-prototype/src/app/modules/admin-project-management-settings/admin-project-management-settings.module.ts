import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AdminProjectManagementSettingsRoutingModule } from './admin-project-management-settings-routing.module';
import { AdminProjectManagementSettingsComponent } from './containers/admin-project-management-settings/admin-project-management-settings.component';

@NgModule({
  imports: [CommonModule, AdminProjectManagementSettingsRoutingModule, AdminProjectManagementSettingsComponent],
})
export class AdminProjectManagementSettingsModule {}
