import { AnswerFileKind } from '../models/answer-file-kind.enum';

/**
 * Answers only carry images today. Renderers switch on the kind rather than on the question type so
 * a future media type is a new enum member and a new branch, not a rewrite.
 */
export function getAnswerFileKind(mimetype: string): AnswerFileKind {
  return mimetype.startsWith('image/') ? AnswerFileKind.IMAGE : AnswerFileKind.OTHER;
}
