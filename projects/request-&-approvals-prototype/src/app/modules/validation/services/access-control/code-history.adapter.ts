import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { CodeHistoryRecord, CodeHistoryRecordDTO, CodeHistoryRecordType } from '../../models/code-history.model';

@Injectable({
  providedIn: 'root',
})
export class CodeHistoryAdapter implements AdapterInterface<CodeHistoryRecord, CodeHistoryRecordDTO> {
  fromApiEntries(entries: CodeHistoryRecordDTO[]): CodeHistoryRecord[] {
    const knownTypes: string[] = Object.values(CodeHistoryRecordType);
    return entries.filter(entry => knownTypes.includes(entry.type)).map(entry => this.fromApi(entry));
  }

  fromApi(entry: CodeHistoryRecordDTO): CodeHistoryRecord {
    return {
      attendanceType: entry.attendance_type,
      attendedAt: entry.attended_at,
      errorType: entry.error_type,
      id: entry.id,
      outcome: entry.outcome,
      profile: entry.profile,
      type: entry.type as CodeHistoryRecordType,
      validationChannel: entry.validation_channel,
      validator: entry.validator,
    };
  }
}
