import { asString } from '../_shared/dto-codec.util';
import { FullVideoProps } from './full-video.model';

/** Wire shape (snake_case) — see models/block.dto.ts for the conventions. */
export interface FullVideoPropsDTO {
  src: string;
}

export function fullVideoPropsFromDto(raw: Record<string, unknown>): FullVideoProps {
  return { src: asString(raw['src']) };
}

export function fullVideoPropsToDto(p: FullVideoProps): FullVideoPropsDTO {
  return { src: p.src };
}
