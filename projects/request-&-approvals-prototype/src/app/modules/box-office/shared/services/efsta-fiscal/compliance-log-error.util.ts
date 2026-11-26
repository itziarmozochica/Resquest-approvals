import { HttpErrorResponse } from '@angular/common/http';

import { ComplianceLogData } from './models/compliance-log.model';

export function describeComplianceLogError(error: unknown): Pick<ComplianceLogData, 'details' | 'httpStatus'> {
  if (error instanceof HttpErrorResponse) {
    return { details: error.message, httpStatus: error.status };
  }
  return { details: error instanceof Error ? error.message : String(error) };
}
