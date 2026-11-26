export interface ProjectsListApiResponse {
  projects: ProjectApiDto[];
  // Partner-wide totals, records with no project included. Older backends do not send them.
  pending_information_requests_total?: number;
  pending_approvals_total?: number;
  pending_evaluation_information_requests_total?: number;
  pending_evaluation_approvals_total?: number;
}

export interface ProjectApiDto {
  id: string;
  partner_id: number;
  name: string;
  city?: string;
  country_code?: string;
  event_date?: string;
  open_gates_date?: string;
  lifecycle_status: string;
  pending_information_requests_count?: number;
  pending_approvals_count?: number;
  pending_evaluation_information_requests_count?: number;
  pending_evaluation_approvals_count?: number;
  created_at: string;
  updated_at: string;
  salesforce_launch_id?: string;
  launch_id_c?: string;
  venue?: string;
  pm_email?: string;
  bd_email?: string;
  sales_launch_date?: string;
  closed_gates_date?: string;
}
