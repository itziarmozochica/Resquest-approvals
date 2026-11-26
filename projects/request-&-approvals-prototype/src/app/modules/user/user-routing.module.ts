import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const HOME = '/project-management/projects';

/**
 * Prototype: there is no login. Every authentication route lands on Requests & Approval.
 */
const routes: Routes = [
  { path: 'login', pathMatch: 'full', redirectTo: HOME },
  { path: 'login/:variant', redirectTo: HOME },
  { path: 'mfa/:step', redirectTo: HOME },
  { path: '**', redirectTo: HOME },
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)],
})
export class UserRoutingModule {}
