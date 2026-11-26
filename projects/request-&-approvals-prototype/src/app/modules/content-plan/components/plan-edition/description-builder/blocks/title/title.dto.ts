import { asString } from '../_shared/dto-codec.util';
import { TitleProps } from './title.model';

/** Wire shape (snake_case) — see models/block.dto.ts for the conventions. */
export interface TitlePropsDTO {
  text: string;
  level: 'h1' | 'h2' | 'h3';
}

const VALID_TITLE_LEVELS: ReadonlySet<TitleProps['level']> = new Set(['h1', 'h2', 'h3']);

export function titlePropsFromDto(raw: Record<string, unknown>): TitleProps {
  const level = raw['level'];
  return {
    text: asString(raw['text']),
    level: typeof level === 'string' && VALID_TITLE_LEVELS.has(level as TitleProps['level']) ? (level as TitleProps['level']) : 'h2',
  };
}

export function titlePropsToDto(p: TitleProps): TitlePropsDTO {
  return { text: p.text, level: p.level };
}
