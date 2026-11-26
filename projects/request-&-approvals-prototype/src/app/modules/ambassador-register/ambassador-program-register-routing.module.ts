import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AmbassadorProgramRegisterComponent } from '@fz-original/app/ambassadors/containers/ambassador-register/ambassador-program-register.component';
import { ambassadorProgramRegisterResolver } from '@fz-original/app/ambassadors/resolvers/ambassador-program-register.resolver';

import { FourHundredFourComponent } from '../../shared/components/error/four-hundred-four/four-hundred-four.component';

const routes: Routes = [
  {
    path: ':id/register',
    component: AmbassadorProgramRegisterComponent,
    resolve: {
      programDetailPublic: ambassadorProgramRegisterResolver,
    },
  },
  {
    path: 'not-found',
    component: FourHundredFourComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AmbassadorProgramRegisterRoutingModule {}
