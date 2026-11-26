import { asNumber } from '../_shared/dto-codec.util';
import { SpacerProps } from './spacer.model';

/** Wire shape (snake_case) — see models/block.dto.ts for the conventions. */
export interface SpacerPropsDTO {
  size: number;
}

const SPACER_DEFAULT_SIZE = 32;

export function spacerPropsFromDto(raw: Record<string, unknown>): SpacerProps {
  return { size: asNumber(raw['size'], SPACER_DEFAULT_SIZE) };
}

export function spacerPropsToDto(p: SpacerProps): SpacerPropsDTO {
  return { size: p.size };
}
