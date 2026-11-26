import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ProjectsListComponent } from './containers/projects-list/projects-list.component';
import { RecordsListComponent } from './containers/records-list/records-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'projects', pathMatch: 'full' },
  { path: 'projects', component: ProjectsListComponent },
  {
    path: 'projects/:projectId',
    component: RecordsListComponent,
    data: { defaultTypes: ['request', 'approval'], defaultStatus: 'pending' },
  },
  {
    path: '',
    loadChildren: async () => await import('../ir-approval/ir-approval.module').then(m => m.IrApprovalModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProjectManagementRoutingModule {}
