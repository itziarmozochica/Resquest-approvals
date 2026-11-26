import { InjectionToken } from '@angular/core';

import { FormGroupControl } from '../models';

export const FORM_GROUP_CONTROLS = new InjectionToken<Array<FormGroupControl<any, any>>>('FORM_GROUP_CONTROLS');
export const FORM_GROUP_CONTROLS_DEFAULT = new InjectionToken<FormGroupControl<any, any>>('FORM_GROUP_CONTROLS_DEFAULT');
