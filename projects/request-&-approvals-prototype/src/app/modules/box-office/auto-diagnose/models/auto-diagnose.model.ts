import type { TagSentiment } from '@ignite/common';
import type { IgntIconName, IgntIconVariant } from '@ignite/icon';

export enum DiagnoseStatus {
  blocked = 'blocked',
  failed = 'failed',
  notTested = 'not-tested',
  ok = 'ok',
  testing = 'testing',
  warning = 'warning',
}

export interface DiagnoseStatusPresentation {
  icon: IgntIconName;
  iconVariant: IgntIconVariant;
  labelKey: string;
  sentiment: TagSentiment;
}

export const DIAGNOSE_STATUS_PRESENTATION: Readonly<Record<DiagnoseStatus, DiagnoseStatusPresentation>> = {
  [DiagnoseStatus.blocked]: {
    icon: 'info-circle',
    iconVariant: 'solid',
    labelKey: 'boxOffice.autoDiagnose.status.blocked',
    sentiment: 'disable',
  },
  [DiagnoseStatus.failed]: {
    icon: 'times-circle',
    iconVariant: 'solid',
    labelKey: 'boxOffice.autoDiagnose.status.failed',
    sentiment: 'danger',
  },
  [DiagnoseStatus.notTested]: {
    icon: 'info-circle',
    iconVariant: 'solid',
    labelKey: 'boxOffice.autoDiagnose.status.notTested',
    sentiment: 'info',
  },
  [DiagnoseStatus.ok]: {
    icon: 'check-circle',
    iconVariant: 'solid',
    labelKey: 'boxOffice.autoDiagnose.status.ok',
    sentiment: 'positive',
  },
  [DiagnoseStatus.testing]: {
    icon: 'spinner',
    iconVariant: 'solid',
    labelKey: 'boxOffice.autoDiagnose.status.testing',
    sentiment: 'accent',
  },
  [DiagnoseStatus.warning]: {
    icon: 'exclamation-triangle',
    iconVariant: 'solid',
    labelKey: 'boxOffice.autoDiagnose.status.warning',
    sentiment: 'warning',
  },
};

export interface DiagnoseTileDetail {
  labelKey: string;
  value: string;
  translateValue?: boolean;
}

export interface DiagnoseTileAction {
  labelKey: string;
  icon?: IgntIconName;
}
