export interface LinkOut {
  channelId: string | null;
  language: string | null;
  redirectionUrl: string;
  shouldShowMainPlanView: boolean;
}

export interface LinkOutSettings {
  endsAt: Date | null;
  linkOuts: LinkOut[];
  startsAt: Date | null;
  ticketPrice: string | null;
  attendText?: string | null;
}

export interface LinkOutData {
  channel_id: string | null;
  language: string | null;
  redirection_url: string;
  should_show_main_plan_view: boolean;
}

export interface LinkOutSettingsData {
  ends_at: string | null;
  link_outs: LinkOutData[];
  starts_at: string | null;
  ticket_price: string | null;
  attend_text?: string | null;
}
