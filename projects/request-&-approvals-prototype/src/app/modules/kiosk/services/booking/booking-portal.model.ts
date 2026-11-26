export interface BookingPortal {
  otoken: string;
  url: string;
}

export interface BookingPortalResponseData {
  booking_portal_url: string;
  otoken: string;
}

export interface BookingPortalResponse {
  data: BookingPortalResponseData | null;
}
