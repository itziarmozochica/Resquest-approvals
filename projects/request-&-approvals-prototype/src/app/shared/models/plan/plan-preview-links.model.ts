export interface PlanPreviewLink {
  channel_ids: string[];
  link: string;
  name: string;
}

export interface PlanPreviewLinksApiData {
  preview_links: PlanPreviewLink[];
}
