export interface EfstaZReportTaxGroup {
  readonly grossAmount: string;
  readonly ratePercent: number | null;
  readonly taxGroup: string;
}

export interface EfstaZReport {
  readonly reportedTotal: string;
  readonly taxGroups: readonly EfstaZReportTaxGroup[];
  readonly zi: number;
}

export interface EfstaZReportParsed {
  readonly report: EfstaZReport;
  readonly status: 'parsed';
}

export interface EfstaZReportInvalid {
  readonly reason: string;
  readonly status: 'invalid';
}

export type EfstaZReportParseResult = EfstaZReportInvalid | EfstaZReportParsed;
