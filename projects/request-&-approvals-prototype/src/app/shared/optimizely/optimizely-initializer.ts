import { isPlatformServer } from '@angular/common';

import { OptimizelyService } from './optimizely.service';

export function optimizelyInitializer(optimizely: OptimizelyService, platform: Record<string, any>): () => Promise<void> {
  return () => {
    if (isPlatformServer(platform)) {
      return Promise.resolve();
    }
    return optimizely.initialize();
  };
}
