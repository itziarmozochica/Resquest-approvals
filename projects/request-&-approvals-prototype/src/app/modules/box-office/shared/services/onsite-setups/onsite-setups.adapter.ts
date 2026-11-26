import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../../core/adapter.interface';
import { OnsiteSetup, OnsiteSetupDTO } from '../../models/onsite-setup';

@Injectable({
  providedIn: 'root',
})
export class OnsiteSetupsAdapter implements AdapterInterface<Array<OnsiteSetupDTO>, Array<OnsiteSetup>> {
  fromApi(response: Array<OnsiteSetupDTO>): Array<OnsiteSetup> {
    return response;
  }
}
