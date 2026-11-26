import { inject, Injectable } from '@angular/core';

import { IconName } from '@fortawesome/fontawesome-svg-core';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';

import {
  CodeHistoryOutcome,
  CodeHistoryQuery,
  CodeHistoryRecord,
  CodeHistoryRecordType,
} from '../../../../../../modules/validation/models/code-history.model';
import { AccessControlService } from '../../../../../../modules/validation/services/access-control/access-control.service';
import {
  getCodeHistoryErrorDescriptionKey,
  getCodeHistoryErrorTitleKey,
} from '../../../../../../modules/validation/utils/code-history-error-keys.util';
import { TransferIntent, TransferIntentStatus } from '../../../../../models/cart/transfer-intent.model';
import { CursorPaginationResponse } from '../../../../../models/cursor-pagination-response';
import { TicketHistoryItem, TicketHistoryItemType, ValidationHistoryInfo } from '../ticket-history/ticket-history-item';

type CodeHistoryItemType =
  | TicketHistoryItemType.CREATED
  | TicketHistoryItemType.VALIDATION
  | TicketHistoryItemType.VALIDATION_FAILED
  | TicketHistoryItemType.VALIDATION_REVERTED;

const historyNameKeyByCodeHistoryItemType: Record<CodeHistoryItemType, string> = {
  [TicketHistoryItemType.CREATED]: 'validateTicketsNew.ticketHistory.created',
  [TicketHistoryItemType.VALIDATION]: 'validateTicketsNew.ticketHistory.validation',
  [TicketHistoryItemType.VALIDATION_FAILED]: 'validateTicketsNew.ticketHistory.validationFailed',
  [TicketHistoryItemType.VALIDATION_REVERTED]: 'validateTicketsNew.ticketHistory.validationReverted',
};

const iconByCodeHistoryItemType: Record<CodeHistoryItemType, IconName> = {
  [TicketHistoryItemType.CREATED]: 'toggle-off',
  [TicketHistoryItemType.VALIDATION]: 'check',
  [TicketHistoryItemType.VALIDATION_FAILED]: 'times',
  [TicketHistoryItemType.VALIDATION_REVERTED]: 'undo',
};

const historyNameKeyByTransferStatus: Record<TransferIntentStatus, string> = {
  claimed: 'validateTicketsNew.ticketHistory.transferCompleted',
  pending: 'validateTicketsNew.ticketHistory.transferInProgress',
  revoked: 'validateTicketsNew.ticketHistory.transferCancelled',
};

const iconByTransferStatus: Record<TransferIntentStatus, IconName> = {
  claimed: 'file-check',
  pending: 'paper-plane',
  revoked: 'times',
};

const historyTypeByTransferStatus: Record<TransferIntentStatus, TicketHistoryItemType> = {
  claimed: TicketHistoryItemType.TRANSFER_COMPLETED,
  pending: TicketHistoryItemType.TRANSFER_IN_PROGRESS,
  revoked: TicketHistoryItemType.DEFAULT,
};

export interface TicketHistoryPageContext {
  code: string;
  cursor: string | null;
  transferIntent: TransferIntent | null;
}

@Injectable({
  providedIn: 'root',
})
export class TicketHistoryService {
  readonly #accessControlService = inject(AccessControlService);
  readonly #translateService = inject(TranslateService);

  getTicketHistoryPage(context: TicketHistoryPageContext): Observable<CursorPaginationResponse<TicketHistoryItem[] | null>> {
    const { code, cursor, transferIntent } = context;
    const query: CodeHistoryQuery = cursor === null ? { code } : { cursor };
    return this.#accessControlService.getCodeHistory(query).pipe(
      map(page => {
        if (page.data === null) {
          return new CursorPaginationResponse<TicketHistoryItem[] | null>(null, null, page.error);
        }
        const codeHistoryItems = this.#getCodeHistoryItems(page.data);
        const transferHistoryItems = cursor === null && transferIntent !== null ? this.#getTransferHistory(code, transferIntent) : [];
        return new CursorPaginationResponse<TicketHistoryItem[] | null>(
          page.getNextCursor(),
          [...codeHistoryItems, ...transferHistoryItems],
          null,
        );
      }),
    );
  }

  #getCodeHistoryItems(records: CodeHistoryRecord[]): TicketHistoryItem[] {
    return records.map(record => this.#getCodeHistoryItem(record));
  }

  #getCodeHistoryItem(record: CodeHistoryRecord): TicketHistoryItem {
    const type = this.#getCodeHistoryItemType(record);
    return {
      date: record.attendedAt,
      description: this.#getCodeHistoryItemDescription(type, record),
      errorType: record.errorType,
      extraInfo: this.#getValidationHistoryInfo(record),
      icon: iconByCodeHistoryItemType[type],
      id: record.id,
      key: `${type}-${record.id ?? record.attendedAt}`,
      name: this.#getCodeHistoryItemName(type, record),
      type,
    };
  }

  #getCodeHistoryItemName(type: CodeHistoryItemType, record: CodeHistoryRecord): string {
    const nameKey =
      type === TicketHistoryItemType.VALIDATION_FAILED
        ? getCodeHistoryErrorTitleKey(record.errorType)
        : historyNameKeyByCodeHistoryItemType[type];
    return this.#translateService.instant(nameKey);
  }

  #getCodeHistoryItemDescription(type: CodeHistoryItemType, record: CodeHistoryRecord): string | null {
    switch (type) {
      case TicketHistoryItemType.VALIDATION:
        return this.#translateService.instant('validateTicketsNew.ticketHistory.validatedSuccessfully');
      case TicketHistoryItemType.VALIDATION_FAILED:
        return this.#translateService.instant(getCodeHistoryErrorDescriptionKey(record.errorType));
      default:
        return null;
    }
  }

  #getCodeHistoryItemType(record: CodeHistoryRecord): CodeHistoryItemType {
    switch (record.type) {
      case CodeHistoryRecordType.CREATED:
        return TicketHistoryItemType.CREATED;
      case CodeHistoryRecordType.VALIDATION_REVERTED:
        return TicketHistoryItemType.VALIDATION_REVERTED;
      default:
        return record.outcome === CodeHistoryOutcome.FAILURE ? TicketHistoryItemType.VALIDATION_FAILED : TicketHistoryItemType.VALIDATION;
    }
  }

  #getValidationHistoryInfo(record: CodeHistoryRecord): ValidationHistoryInfo | null {
    const profile = record.profile?.name ?? null;
    const validator = record.validator;
    if (profile === null && validator === null) {
      return null;
    }
    return { profile, validator };
  }

  #getTransferHistory(code: string, transferIntent: TransferIntent): TicketHistoryItem[] {
    const isCodeInTransfer = transferIntent.codes.some(transferIntentCode => transferIntentCode.code === code);
    if (!isCodeInTransfer) {
      return [];
    }

    const user =
      transferIntent.onlyClaimableBy && transferIntent.status !== 'revoked' ? { email: transferIntent.onlyClaimableBy.email } : null;
    const extraInfo = user ? { user } : null;

    const date = transferIntent.status === 'pending' ? transferIntent.createdAt : null; // We only have the creation date
    return [
      {
        date,
        description: null,
        errorType: null,
        extraInfo,
        icon: iconByTransferStatus[transferIntent.status],
        id: null,
        key: `${historyTypeByTransferStatus[transferIntent.status]}-${transferIntent.id}`,
        name: this.#translateService.instant(historyNameKeyByTransferStatus[transferIntent.status]),
        type: historyTypeByTransferStatus[transferIntent.status],
      },
    ];
  }
}
