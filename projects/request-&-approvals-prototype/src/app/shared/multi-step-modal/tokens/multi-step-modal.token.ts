import { InjectionToken } from '@angular/core';

import type { MultiStepModalController } from '../models/multi-step-modal-controller.model';
import type { MultiStepModalConfig } from '../models/multi-step-modal.model';

export const MULTI_STEP_MODAL_CONFIG = new InjectionToken<MultiStepModalConfig<unknown, string, string>>('MULTI_STEP_MODAL_CONFIG');

export const MULTI_STEP_MODAL_CONTROLLER = new InjectionToken<MultiStepModalController>('MULTI_STEP_MODAL_CONTROLLER');
