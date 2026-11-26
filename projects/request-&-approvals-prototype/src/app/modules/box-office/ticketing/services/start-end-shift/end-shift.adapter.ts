import { Injectable } from '@angular/core';

import { EndShift, EndShiftDTO } from '../../models/end-shift';

@Injectable({
  providedIn: 'root',
})
export class EndShiftAdapter {
  toApi(query: EndShift): EndShiftDTO {
    return {
      final_amount: query.finalAmount,
    };
  }
}
