import {
  transformCenterTagToTextAlignCenter,
  transformQuillText,
} from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-legacy-content.utils';

import { asString } from '../_shared/dto-codec.util';
import { ParagraphProps } from './paragraph.model';

/** Wire shape (snake_case) — see models/block.dto.ts for the conventions. */
export interface ParagraphPropsDTO {
  text: string;
}

export function paragraphPropsFromDto(raw: Record<string, unknown>): ParagraphProps {
  return { text: transformCenterTagToTextAlignCenter(asString(raw['text'])) };
}

export function paragraphPropsToDto(p: ParagraphProps): ParagraphPropsDTO {
  return { text: transformQuillText(p.text) };
}
