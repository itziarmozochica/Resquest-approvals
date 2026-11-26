import { ProjectApiDto } from './project-api.model';
import { ProjectStatus } from './project-status.enum';
import { Project } from './project.model';

export function mapProjectDtoToProject(dto: ProjectApiDto): Project {
  return {
    id: dto.id,
    partnerId: dto.partner_id,
    name: dto.name,
    city: dto.city,
    countryCode: dto.country_code,
    eventDate: parseDate(dto.event_date),
    openGatesDate: parseDate(dto.open_gates_date),
    lifecycleStatus: parseStatus(dto.lifecycle_status),
    pendingInformationRequestsCount: dto.pending_information_requests_count ?? 0,
    pendingApprovalsCount: dto.pending_approvals_count ?? 0,
    pendingEvaluationInformationRequestsCount: dto.pending_evaluation_information_requests_count ?? 0,
    pendingEvaluationApprovalsCount: dto.pending_evaluation_approvals_count ?? 0,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
    salesforceLaunchId: dto.salesforce_launch_id,
    launchIdC: dto.launch_id_c,
    displayCode: dto.launch_id_c ?? undefined,
    venue: dto.venue,
    pmEmail: dto.pm_email,
    bdEmail: dto.bd_email,
    salesLaunchDate: parseDate(dto.sales_launch_date),
    closedGatesDate: parseDate(dto.closed_gates_date),
  };
}

function parseDate(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

function parseStatus(value: string): ProjectStatus {
  return Object.values(ProjectStatus).includes(value as ProjectStatus) ? (value as ProjectStatus) : ProjectStatus.UPCOMING;
}
