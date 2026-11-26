/**
 * Legacy-only transforms for the `ql-align-center` dialect still present in stored content.
 * Scheduled for deletion once the remaining consumers are migrated (B2BP-895): the
 * description-builder block DTOs (image grid, paragraph, tabs) and the v2 plan translations
 * editor.
 *
 * New code belongs in `rich-text-editor-content.utils.ts`, which covers both directions of
 * the `<center>` format the TipTap editor reads and emits. Two near-identical dialects share
 * this folder, so check which one a consumer persists before importing either.
 */

export const transformCenterTagToTextAlignCenter = (htmlString: string): string => {
  const centerOpeningTagRegexString = '<center\\s*((?:(?!>).)*)>';
  const emptyCenterTagRegex = new RegExp(`${centerOpeningTagRegexString}\\s*</center>`, 'g');
  const centerOpeningTagRegex = new RegExp(centerOpeningTagRegexString, 'g');

  return htmlString
    ?.replace(emptyCenterTagRegex, (_match: string, p1: string) => `<p class="ql-align-center"${p1 ? ` ${p1}` : ''}><br /></p>`)
    ?.replace(centerOpeningTagRegex, (_match: string, p1: string) => '<p class="ql-align-center"' + (p1 ? ` ${p1}` : '') + '>')
    ?.replace(/<\/center>/g, '</p>');
};

/**
 * @param quillText Rich text in the legacy `ql-align-center` dialect
 * @returns The text with `<br>` instead of empty `<p>`, and having `<center>` tags instead of `<p class="ql-align-center">`
 */
export const transformQuillText = (quillText: string): string => {
  const regex = new RegExp('<p(?:\\s+(class="ql-align-center"))?>((?:(?!<\\/p>|<p(?:\\s+class="ql-align-center")?>).)*)<\\/p>', 'gm');

  let transformedDescription = quillText;

  while (transformedDescription.match(regex)) {
    transformedDescription = transformedDescription.replace(regex, (_match, p1, p2) => {
      if (p1) {
        return `<center>${p2 ?? ''}</center>`;
      } else {
        return `${p2 ?? ''}${p2 !== '<br>' ? '<br>' : ''}`;
      }
    });
  }

  return transformedDescription;
};
