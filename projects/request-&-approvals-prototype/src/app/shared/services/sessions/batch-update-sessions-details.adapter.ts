import { Injectable } from '@angular/core';

import { BatchSessionChange, BatchSessionChangeDTO } from './session-resource-change.model';

@Injectable({
  providedIn: 'root',
})
export class BatchUpdateSessionsDetailsAdapter {
  toApi({ isHidden, soldOut }: BatchSessionChange): BatchSessionChangeDTO {
    return {
      ...(isHidden !== undefined ? { is_hidden: isHidden } : {}),
      ...(soldOut !== undefined ? { sold_out: soldOut } : {}),
    };
  }
}
