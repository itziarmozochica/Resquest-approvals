import { ProjectStatus } from './project-status.enum';

export interface Project {
  id: string;
  partnerId: number;
  name: string;
  city?: string;
  countryCode?: string;
  eventDate?: Date;
  openGatesDate?: Date;
  lifecycleStatus: ProjectStatus;
  pendingInformationRequestsCount: number;
  pendingApprovalsCount: number;
  pendingEvaluationInformationRequestsCount: number;
  pendingEvaluationApprovalsCount: number;
  createdAt: Date;
  updatedAt: Date;
  salesforceLaunchId?: string;
  launchIdC?: string;
  displayCode?: string;
  venue?: string;
  pmEmail?: string;
  bdEmail?: string;
  salesLaunchDate?: Date;
  closedGatesDate?: Date;
}

// `null` when the backend does not send the total.
export interface ProjectsPendingTotals {
  informationRequests: number | null;
  approvals: number | null;
  evaluationInformationRequests: number | null;
  evaluationApprovals: number | null;
}
