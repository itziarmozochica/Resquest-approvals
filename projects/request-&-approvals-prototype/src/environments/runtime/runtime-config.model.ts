import { Environment } from '../environment.model';

export interface RuntimeConfig {
  environment: Environment;
  shell: RuntimeShellConfig;
}

export interface RuntimeShellConfig {
  faviconDirectory: string;
  thirdParty: ThirdPartyConfig;
  headerbarColors?: HeaderbarColors;
}

export interface HeaderbarColors {
  background: string;
  foreground: string;
}

export interface ThirdPartyConfig {
  gtagId: string;
  hotjarId?: string;
  mixpanelDebug?: string;
  mixpanelToken?: string;
}
