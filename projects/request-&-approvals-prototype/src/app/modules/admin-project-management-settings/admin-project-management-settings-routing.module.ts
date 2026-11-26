import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminProjectManagementSettingsComponent } from './containers/admin-project-management-settings/admin-project-management-settings.component';

const routes: Routes = [{ path: '', component: AdminProjectManagementSettingsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminProjectManagementSettingsRoutingModule {}
