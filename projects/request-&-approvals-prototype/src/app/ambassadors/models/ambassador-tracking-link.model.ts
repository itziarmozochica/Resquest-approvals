export interface AmbassadorTrackingLink {
  applicationId: number;
  applicationName: string;
  trackingLink: string;
}

export interface AmbassadorTrackingLinks {
  tracking_links: AmbassadorTrackingLink[];
}

export interface AmbassadorTrackingLinkResponse {
  tracking_links: AmbassadorTrackingLinkData[];
}

export interface AmbassadorTrackingLinkData {
  application_id: number;
  application_name: string;
  tracking_link: string;
}
