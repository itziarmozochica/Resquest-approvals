import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ProjectDetailComponent } from './containers/project-detail/project-detail.component';
import { ProjectsListComponent } from './containers/projects-list/projects-list.component';
import { ProjectManagementRoutingModule } from './project-management-routing.module';

@NgModule({
  imports: [CommonModule, ProjectManagementRoutingModule, ProjectsListComponent, ProjectDetailComponent],
})
export class ProjectManagementModule {}
