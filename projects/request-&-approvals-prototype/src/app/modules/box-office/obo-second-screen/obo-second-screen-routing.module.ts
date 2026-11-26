import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RoutePrimaryPath } from '@fz-original/app/app/enums/route.enum';

import { OboSecondScreenComponent } from './components/obo-second-screen.component';

const routes: Routes = [
  {
    path: RoutePrimaryPath[RoutePrimaryPath['obo-second-screen']],
    component: OboSecondScreenComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class OboSecondScreenRoutingModule {}
