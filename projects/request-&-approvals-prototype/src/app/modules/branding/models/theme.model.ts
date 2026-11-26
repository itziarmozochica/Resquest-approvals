export interface MainPlan {
  id: number;
  name: string;
}

export interface ThemedUrlResponse {
  url: string;
}

export interface ThemeApiRequest {
  base_color: string;
  primary_color: string;
  contrast_base_color: string;
  body_font_color: string;
  background_color: string;
  contrast_primary_color: string;
  main_plan_ids: number[];
}

export interface ThemeApiResponse {
  base_color: string;
  primary_color: string;
  contrast_base_color: string;
  body_font_color: string;
  background_color: string;
  contrast_primary_color: string;
  main_plan_ids: number[];
}

export interface Theme {
  headerColor: string;
  titleColor: string;
  backgroundColor: string;
  mainTextColor: string;
  buttonColor: string;
  buttonTextColor: string;
  appliedEvents: number[];
}

export interface ThemedUrlResponse {
  url: string;
}
