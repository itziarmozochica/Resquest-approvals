import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { PlanDetailPublic, PlanDetailPublicResponse } from '../../models/plan/plan.model';

@Injectable({
  providedIn: 'root',
})
export class PlanDetailPublicAdapter implements AdapterInterface<PlanDetailPublic> {
  fromApi(data: PlanDetailPublicResponse): PlanDetailPublic {
    return {
      id: data.id,
      name: data.name,
      coverImage: data.gallery[0],
      partnerId: data.partner_id,
      logoUrl: data.logo_url,
      venue: data.places[0].name,
      rating: data.rating,
    };
  }
}
