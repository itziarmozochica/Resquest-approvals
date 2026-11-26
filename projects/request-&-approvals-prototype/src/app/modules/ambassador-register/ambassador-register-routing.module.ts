import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { FourHundredFourComponent } from '../../shared/components/error/four-hundred-four/four-hundred-four.component';
import { AmbassadorRegisterComponent } from './components/ambassador-register/ambassador-register.component';
import { ambassadorRegisterResolver } from './resolvers/ambassador-register.resolver';

const routes: Routes = [
  {
    path: 'plan/:id/register',
    component: AmbassadorRegisterComponent,
    resolve: {
      planDetailPublic: ambassadorRegisterResolver,
    },
  },
  {
    path: 'plan/not-found',
    component: FourHundredFourComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AmbassadorRegisterRoutingModule {}
