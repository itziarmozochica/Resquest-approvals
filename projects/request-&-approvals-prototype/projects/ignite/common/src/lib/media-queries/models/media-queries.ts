export interface IgntMediaQueriesState {
  desktopLg: boolean;
  desktopMd: boolean;
  desktopSm: boolean;
  isInitialized: boolean;
  mobile: boolean;
  tablet: boolean;
}

export const mediaQueriesInitialState: IgntMediaQueriesState = {
  desktopLg: false,
  desktopMd: false,
  desktopSm: false,
  isInitialized: false,
  mobile: false,
  tablet: false,
};
