import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BulkUploadPreviewDTO } from '../dto/bulk-upload-preview.dto';
import { BulkUploadPreview } from '../models/bulk-upload-preview.model';

@Injectable({
  providedIn: 'root',
})
export class BulkUploadPreviewAdapter implements AdapterInterface<BulkUploadPreview, BulkUploadPreviewDTO> {
  fromApi(bulkUploadPreview: BulkUploadPreviewDTO): BulkUploadPreview {
    return this.transformData(bulkUploadPreview);
  }

  private transformData(dto: BulkUploadPreviewDTO): BulkUploadPreview {
    const previewResults: Record<string, any> = {};
    Object.entries(dto.preview_results).forEach(([sessionId, sessionData]) => {
      previewResults[sessionId] = {
        existingCodes: sessionData.existing_codes,
        newCodes: sessionData.new_codes,
        repeatedCodes: sessionData.repeated_codes,
        summary: {
          totalExisting: sessionData.summary.total_existing,
          totalNew: sessionData.summary.total_new,
          totalRepeated: sessionData.summary.total_repeated,
          totalInFile: sessionData.summary.total_in_file,
        },
      };
    });

    const sessionMap: Record<string, any> = {};
    if (dto.session_map) {
      Object.entries(dto.session_map).forEach(([sessionId, sessionInfo]) => {
        sessionMap[sessionId] = {
          sessionType: sessionInfo.session_type_label,
          timeslot: sessionInfo.starts_at,
        };
      });
    }

    return {
      previewResults,
      sessionMap,
      repeatedCodes: dto.repeated_codes,
      sessionsWithAccessControlRecords: dto.sessions_with_access_control_records,
      sessionsNotInt: dto.sessions_not_int,
      sessionsNotFound: dto.sessions_not_found,
      sessionsNotBelongToPartner: dto.sessions_not_belong_to_partner,
      sessionsNotBelongToMainPlan: dto.sessions_not_belong_to_main_plan,
    };
  }
}
