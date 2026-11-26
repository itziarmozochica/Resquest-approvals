export type CashRegisterReportStatus =
  | 'requested'
  | 'created'
  | 'in_review'
  | 'approved'
  | 'sending'
  | 'sent'
  | 'error'
  | 'discarded'
  | 'to_amend'
  | 'outdated';

export interface CashRegisterReportDTO {
  created_at: Date;
  deadline: Date;
  id: string;
  location: {
    city: {
      id: number;
      name: string;
    };
    id: string;
    venue: {
      id: number;
      name: string;
    };
  };
  replaced_by: string;
  status: CashRegisterReportStatus;
  updated_at: Date;
}

export interface CashRegisterReport {
  createdAt: Date;
  deadline: Date;
  id: string;
  loading: boolean;
  location: {
    city: {
      id: number;
      name: string;
    };
    id: string;
    venue: {
      id: number;
      name: string;
    };
  };
  replacedBy: string;
  status: CashRegisterReportStatus;
  updatedAt: Date;
}
