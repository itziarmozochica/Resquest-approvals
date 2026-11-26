export interface FztTapWaveState {
  readonly isActive: boolean;
  readonly isClickIndicator: boolean;
  readonly left: string;
  readonly top: string;
}

export const FZT_IDLE_TAP_WAVE: FztTapWaveState = { isActive: false, isClickIndicator: false, left: '0px', top: '0px' };
