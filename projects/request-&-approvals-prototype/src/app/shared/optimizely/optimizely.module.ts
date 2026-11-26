import { inject, ModuleWithProviders, NgModule, PLATFORM_ID, provideAppInitializer } from '@angular/core';

import { OptimizelyFeatureDirective } from './optimizely-feature.directive';
import { optimizelyInitializer } from './optimizely-initializer';
import { OPTIMIZELY_SDK_KEY, OptimizelyService } from './optimizely.service';

@NgModule({
  declarations: [OptimizelyFeatureDirective],
  exports: [OptimizelyFeatureDirective],
})
export class OptimizelyModule {
  static configure(sdkKey: string): ModuleWithProviders<OptimizelyModule> {
    return {
      ngModule: OptimizelyModule,
      providers: [
        OptimizelyService,
        { provide: OPTIMIZELY_SDK_KEY, useValue: sdkKey },
        provideAppInitializer(() => optimizelyInitializer(inject(OptimizelyService), inject(PLATFORM_ID))()),
      ],
    };
  }
}
