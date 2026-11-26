import { signalStore } from '@ngrx/signals';

import { withOnsiteSetupStoreFeature } from './onsite-setup.feature';

export const OnsiteSetupStore = signalStore(withOnsiteSetupStoreFeature());
