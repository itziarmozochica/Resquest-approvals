import { Observable } from 'rxjs';

import { EfrPrinterState } from './efr-printer-state.model';
import { FiscalDayFlowVariant, FiscalPrinterStateSource } from './fiscal-country-profile.model';

export enum EfrHealthErrorCode {
  COVER_OPEN = 'COVER_OPEN',
  EFR_STATE_UNREADABLE = 'EFR_STATE_UNREADABLE',
  EFR_UNREACHABLE = 'EFR_UNREACHABLE',
  FISCAL_DAY_NOT_OPEN = 'FISCAL_DAY_NOT_OPEN',
  FISCAL_MISCONFIGURED = 'FISCAL_MISCONFIGURED',
  FISCAL_SERVICE_UNAVAILABLE = 'FISCAL_SERVICE_UNAVAILABLE',
  PAPER_END = 'PAPER_END',
  PRINTER_OFFLINE = 'PRINTER_OFFLINE',
  Z_REQUIRED = 'Z_REQUIRED',
}

export interface EfrHealthErrorCause {
  readonly descriptionKey: string;
  readonly solutionKeys: readonly string[];
}

export interface EfrHealthErrorConfig {
  readonly causes: readonly EfrHealthErrorCause[];
  readonly descriptionKey: string;
  readonly retryable?: boolean;
  readonly titleKey: string;
}

export interface EfrResolvedCause {
  readonly description: string;
  readonly solutions: readonly string[];
}

export interface EfrHealthError {
  readonly causes: readonly EfrResolvedCause[];
  readonly code: EfrHealthErrorCode;
  readonly description: string;
  readonly retryable?: boolean;
  readonly title: string;
}

export interface EfrHealthCheckResult {
  /** The country profile's day-flow the verdict was computed under. Absent when no fiscal country profile applies. */
  readonly dayFlow?: FiscalDayFlowVariant;
  readonly error: EfrHealthError | null;
  readonly healthy: boolean;
  /** The dialect the verdict was actually computed against. Absent when no fiscal country profile applies. */
  readonly source?: FiscalPrinterStateSource;
  readonly state: EfrPrinterState | null;
}

export interface EfrHealthCheckDialogData {
  readonly closeBtnKey?: string;
  readonly hideCloseBtn?: boolean;
  readonly error: EfrHealthError;
  /** Full initial check result (used when tracking last unhealthy outcome on abort). */
  readonly initialUnhealthyResult?: EfrHealthCheckResult;
  readonly onRetry: () => Observable<EfrHealthCheckResult>;
  readonly retryBtnKey?: string;
  /** When true, close/retry emit structured outcomes (`aborted` | `success`) for fiscal registration persistence. */
  readonly trackLastUnhealthyOnAbort?: boolean;
  readonly warningKey?: string;
  readonly closeDayAction?: () => Observable<EfrHealthCheckResult>;
  readonly closeDayActionBtnKey?: string;
}

/** Dialog outcome for the fiscal registration–failure flow (single place closes the modal). */
export interface EfrRegistrationFailureAborted {
  readonly kind: 'aborted';
  readonly lastUnhealthy: EfrHealthCheckResult;
}

export interface EfrRegistrationFailureSucceeded {
  readonly kind: 'success';
  readonly result: EfrHealthCheckResult;
}

export type EfrRegistrationFailureModalClose = EfrRegistrationFailureAborted | EfrRegistrationFailureSucceeded;

export interface EfrGuardPurchaseContext {
  readonly cashRegisterId?: string;
  readonly hasActiveShift: boolean;
  readonly partnerId?: number;
  readonly placeId?: string;
}

export interface FiscalHealthTarget {
  readonly cashRegisterId: string;
  readonly partnerId: number;
  readonly placeId: string;
}

export interface EfrHealthCheckPendingDialogData {
  readonly descriptionKey: string;
  readonly titleKey: string;
}

export interface EfrHealthCheckOptions {
  readonly excludeErrors?: readonly EfrHealthErrorCode[];
  readonly fiscalHealthTarget?: FiscalHealthTarget;
}

const BASE_KEY = 'boxOffice.fiscal.healthCheck';

export const fiscalServicePendingDialogData: EfrHealthCheckPendingDialogData = {
  descriptionKey: `${BASE_KEY}.pendingFiscalService.description`,
  titleKey: `${BASE_KEY}.pendingFiscalService.title`,
};

export const EFR_HEALTH_ERROR_CONFIG: Readonly<Record<EfrHealthErrorCode, EfrHealthErrorConfig>> = {
  [EfrHealthErrorCode.COVER_OPEN]: {
    causes: [
      {
        descriptionKey: `${BASE_KEY}.coverOpen.cause1.description`,
        solutionKeys: [`${BASE_KEY}.coverOpen.cause1.solution1`],
      },
    ],
    descriptionKey: `${BASE_KEY}.coverOpen.description`,
    titleKey: `${BASE_KEY}.coverOpen.title`,
  },
  [EfrHealthErrorCode.EFR_STATE_UNREADABLE]: {
    causes: [
      {
        descriptionKey: `${BASE_KEY}.stateUnreadable.cause1.description`,
        solutionKeys: [`${BASE_KEY}.stateUnreadable.cause1.solution1`],
      },
      {
        descriptionKey: `${BASE_KEY}.stateUnreadable.cause2.description`,
        solutionKeys: [`${BASE_KEY}.stateUnreadable.cause2.solution1`],
      },
    ],
    descriptionKey: `${BASE_KEY}.stateUnreadable.description`,
    titleKey: `${BASE_KEY}.stateUnreadable.title`,
  },
  [EfrHealthErrorCode.EFR_UNREACHABLE]: {
    causes: [
      {
        descriptionKey: `${BASE_KEY}.efrUnreachable.cause1.description`,
        solutionKeys: [`${BASE_KEY}.efrUnreachable.cause1.solution1`],
      },
    ],
    descriptionKey: `${BASE_KEY}.efrUnreachable.description`,
    titleKey: `${BASE_KEY}.efrUnreachable.title`,
  },
  [EfrHealthErrorCode.FISCAL_DAY_NOT_OPEN]: {
    causes: [
      {
        descriptionKey: `${BASE_KEY}.fiscalDayNotOpen.cause1.description`,
        solutionKeys: [`${BASE_KEY}.fiscalDayNotOpen.cause1.solution1`],
      },
    ],
    descriptionKey: `${BASE_KEY}.fiscalDayNotOpen.description`,
    titleKey: `${BASE_KEY}.fiscalDayNotOpen.title`,
  },
  [EfrHealthErrorCode.FISCAL_MISCONFIGURED]: {
    causes: [
      {
        descriptionKey: `${BASE_KEY}.fiscalMisconfigured.cause1.description`,
        solutionKeys: [`${BASE_KEY}.fiscalMisconfigured.cause1.solution1`],
      },
    ],
    descriptionKey: `${BASE_KEY}.fiscalMisconfigured.description`,
    retryable: false,
    titleKey: `${BASE_KEY}.fiscalMisconfigured.title`,
  },
  [EfrHealthErrorCode.FISCAL_SERVICE_UNAVAILABLE]: {
    causes: [
      {
        descriptionKey: `${BASE_KEY}.fiscalServiceUnavailable.cause1.description`,
        solutionKeys: [`${BASE_KEY}.fiscalServiceUnavailable.cause1.solution1`],
      },
    ],
    descriptionKey: `${BASE_KEY}.fiscalServiceUnavailable.description`,
    titleKey: `${BASE_KEY}.fiscalServiceUnavailable.title`,
  },
  [EfrHealthErrorCode.PAPER_END]: {
    causes: [
      {
        descriptionKey: `${BASE_KEY}.paperEnd.cause1.description`,
        solutionKeys: [`${BASE_KEY}.paperEnd.cause1.solution1`],
      },
      {
        descriptionKey: `${BASE_KEY}.paperEnd.cause2.description`,
        solutionKeys: [`${BASE_KEY}.paperEnd.cause2.solution1`],
      },
    ],
    descriptionKey: `${BASE_KEY}.paperEnd.description`,
    titleKey: `${BASE_KEY}.paperEnd.title`,
  },
  [EfrHealthErrorCode.PRINTER_OFFLINE]: {
    causes: [
      {
        descriptionKey: `${BASE_KEY}.printerOffline.cause1.description`,
        solutionKeys: [`${BASE_KEY}.printerOffline.cause1.solution1`, `${BASE_KEY}.printerOffline.cause1.solution2`],
      },
      {
        descriptionKey: `${BASE_KEY}.printerOffline.cause2.description`,
        solutionKeys: [
          `${BASE_KEY}.printerOffline.cause2.solution1`,
          `${BASE_KEY}.printerOffline.cause2.solution2`,
          `${BASE_KEY}.printerOffline.cause2.solution3`,
        ],
      },
      {
        descriptionKey: `${BASE_KEY}.printerOffline.cause3.description`,
        solutionKeys: [`${BASE_KEY}.printerOffline.cause3.solution1`, `${BASE_KEY}.printerOffline.cause3.solution2`],
      },
    ],
    descriptionKey: `${BASE_KEY}.printerOffline.description`,
    titleKey: `${BASE_KEY}.printerOffline.title`,
  },
  [EfrHealthErrorCode.Z_REQUIRED]: {
    causes: [
      {
        descriptionKey: `${BASE_KEY}.zRequired.cause1.description`,
        solutionKeys: [`${BASE_KEY}.zRequired.cause1.solution1`],
      },
      {
        descriptionKey: `${BASE_KEY}.zRequired.cause2.description`,
        solutionKeys: [`${BASE_KEY}.zRequired.cause2.solution1`],
      },
    ],
    descriptionKey: `${BASE_KEY}.zRequired.description`,
    titleKey: `${BASE_KEY}.zRequired.title`,
  },
};
