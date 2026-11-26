import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { OboSecondScreenRoutingModule } from './modules/box-office/obo-second-screen/obo-second-screen-routing.module';
import { OnsiteDevicePreloadingStrategy } from './shared/routes/onsite-device-preloading.strategy';
import { PrivateRoutesFactory } from './shared/routes/private-routes';
import { PublicRoutesFactory } from './shared/routes/public-routes';

@NgModule({
  exports: [RouterModule],
  imports: [
    OboSecondScreenRoutingModule,
    RouterModule.forRoot(PublicRoutesFactory.getRoutes(), { bindToComponentInputs: true }),
    RouterModule.forRoot(PrivateRoutesFactory.getRoutes(), {
      bindToComponentInputs: true,
      preloadingStrategy: OnsiteDevicePreloadingStrategy,
    }),
  ],
})
export class AppRoutingModule {}
