import { asString } from '../_shared/dto-codec.util';
import { FullImageProps } from './full-image.model';

/** Wire shape (snake_case) — see models/block.dto.ts for the conventions. */
export interface FullImagePropsDTO {
  src: string;
}

export function fullImagePropsFromDto(raw: Record<string, unknown>): FullImageProps {
  return { src: asString(raw['src']) };
}

export function fullImagePropsToDto(p: FullImageProps): FullImagePropsDTO {
  return { src: p.src };
}
