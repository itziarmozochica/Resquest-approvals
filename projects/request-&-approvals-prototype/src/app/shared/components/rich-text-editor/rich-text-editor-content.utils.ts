import type { IgntRichTextEditorBlockElement } from '@ignite/rich-text-editor';

/**
 * Content transforms for the TipTap-based `IgntRichTextEditorComponent`.
 *
 * Some consumers persist rich text using legacy `<center>` tags. These helpers
 * convert between that stored format and the markup that TipTap reads and emits.
 * They intentionally live apart from the legacy transforms
 * (`rich-text-editor-legacy-content.utils.ts`), kept only for the legacy
 * dialect still present in stored content (B2BP-895).
 *
 * The legacy dialect terminates every line with `<br>`, so a blank line is two
 * consecutive terminators. Consecutive lines become one paragraph whose hard
 * breaks are the inner `<br>`s, a blank line is the paragraph boundary and every
 * extra blank line becomes an empty paragraph. Saving mirrors the same mapping so
 * the stored shape is a fixed point.
 *
 * Centered images are bridged: Quill stored them inside a centered paragraph
 * (`<center><img></center>`) but the TipTap image is a block node, so on load
 * they become a block image with the `display: block; margin: auto` style the
 * image extension reads as `imageAlign: center`, and the reverse on save.
 *
 * Consecutive `<center>` tags are consecutive centered lines (Quill wrapped each
 * centered line in its own tag), so they load as one centered run.
 *
 * On load, the paragraph block tag mirrors `IgntRichTextEditorComponent`'s
 * `blockElement` input (`'p'` or `'div'`). The two tags group lines differently
 * because they render differently; see `lineToBlock` and `groupLinesIntoParagraphs`.
 * Saving back to the `<center>` format only reads `<p>`: `div` consumers persist
 * TipTap's HTML as-is.
 */

/** Every current caller configures its editor as 'p', or as 'div' and passes 'div' explicitly; this does not mirror Ignite's own default. */
const DEFAULT_BLOCK_TAG: IgntRichTextEditorBlockElement = 'p';

/** The negative lookahead also excludes a nested `<center`, so an unclosed or nested tag fails fast instead of scanning to the end of the input. */
const CENTER_TAG_REGEX = /<center\s*((?:(?!>).)*)>((?:(?!<\/?center\b)[\s\S])*)<\/center>/giu;
const CENTER_OPENING_TAG_REGEX = /<center\s*((?:(?!>).)*)>/gu;
const CENTER_CLOSING_TAG_REGEX = /<\/center>/gu;
const CENTER_WRAPPED_IMAGE_REGEX = /<center\s*(?:(?!>).)*>\s*(<img\b(?:(?!>).)*>)\s*<\/center>/giu;
const IMAGE_TAG_REGEX = /<img\b((?:(?!>).)*)>/giu;
const CENTER_ALIGNED_STYLE_REGEX = /text-align:\s*center/u;
const CENTER_ALIGNED_QUILL_CLASS_REGEX = /\bql-align-center\b/u;
const STYLE_ATTRIBUTE_REGEX = /style\s*=\s*"([^"]*)"/u;
const HTML_TAG_REGEX = /<\/?([a-z][\w:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/giu;
const INLINE_TAG_REGEX = new RegExp(HTML_TAG_REGEX.source, 'giu');
const EMPTY_INLINE_ELEMENT_REGEX = /<([a-z][\w:-]*)\b[^>]*><\/\1>/giu;
const BLOCK_ELEMENT_START_REGEX = /<(p|ul|ol|h[1-6]|blockquote|pre|figure|table|div)\b[^>]*>|<(img|hr)\b[^>]*>/giu;
const BLOCK_ELEMENT_REGEX = /<(?:p|ul|ol|h[1-6]|blockquote|pre|figure|table|div|img|hr)\b/iu;
const EMBEDDED_CONTENT_REGEX = /<(img|iframe|video|audio|hr)\b/iu;
const NON_BREAKING_SPACE_ENTITY_REGEX = /&nbsp;|&#0*160;|&#x0*a0;/giu;

const TOP_LEVEL_PARAGRAPH_REGEX = /^<p([^>]*)>((?:(?!<\/p>)[\s\S])*)<\/p>$/u;
const PARAGRAPH_REGEX = /<p([^>]*)>((?:(?!<\/p>)[\s\S])*)<\/p>/gu;
const LIST_ITEM_PARAGRAPH_REGEX = /<li([^>]*)>\s*<p>((?:(?!<\/?p\b)[\s\S])*)<\/p>/giu;
const TRAILING_LINE_TERMINATOR_REGEX = /<br\s*\/?>\s*$/iu;
const LIST_BLOCK_REGEX = /^<(?:ul|ol)\b/iu;

const LINE_TERMINATOR = '<br>';
const EMPTY_PARAGRAPH_CONTENT = LINE_TERMINATOR;
const CENTERED_IMAGE_STYLE = 'display: block; margin: auto;';
const VOID_HTML_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

interface HtmlSegment {
  isBlock: boolean;
  value: string;
}

interface TopLevelParagraph {
  content: string;
  isCentered: boolean;
}

interface OpenInlineTag {
  markup: string;
  name: string;
}

interface CenterTagRun {
  attributes: string;
  contents: string[];
  end: number;
  markup: string;
  start: number;
}

interface LineBreakRun {
  count: number;
  end: number;
  start: number;
}

function buildCenteredParagraphAttributes(attributes: string): string {
  const styleMatch = STYLE_ATTRIBUTE_REGEX.exec(attributes);

  if (!styleMatch) {
    return `style="text-align: center"${attributes ? ` ${attributes}` : ''}`;
  }

  const mergedStyle = `text-align: center; ${styleMatch[1].trim()}`.trim();
  const otherAttributes = attributes.replace(styleMatch[0], '').replace(/\s+/gu, ' ').trim();

  return `style="${mergedStyle}"${otherAttributes ? ` ${otherAttributes}` : ''}`;
}

/** Adds the block-centering style the image extension reads as `imageAlign: center`. */
function buildCenteredImage(imageTag: string): string {
  const styleMatch = STYLE_ATTRIBUTE_REGEX.exec(imageTag);

  if (!styleMatch) {
    return imageTag.replace(/<img\b/iu, `<img style="${CENTERED_IMAGE_STYLE}"`);
  }

  const mergedStyle = `${CENTERED_IMAGE_STYLE} ${styleMatch[1].trim()}`.trim();

  return imageTag.replace(styleMatch[0], `style="${mergedStyle}"`);
}

/** Detects the `display: block; margin: auto` style a centered image is rendered with. */
function isCenteredImageStyle(style: string): boolean {
  const normalizedStyle = style.replace(/\s/gu, '').toLowerCase();

  if (!normalizedStyle.includes('display:block')) {
    return false;
  }

  return (
    normalizedStyle.includes('margin:auto') ||
    normalizedStyle.includes('margin:0auto') ||
    (normalizedStyle.includes('margin-left:auto') && normalizedStyle.includes('margin-right:auto'))
  );
}

function findClosingTagEnd(html: string, tagName: string, from: number): number {
  const tagRegex = new RegExp(`<(/?)${tagName}\\b[^>]*>`, 'giu');
  let depth = 1;

  tagRegex.lastIndex = from;

  for (let match = tagRegex.exec(html); match !== null; match = tagRegex.exec(html)) {
    depth += match[1] === '/' ? -1 : 1;

    if (depth === 0) {
      return match.index + match[0].length;
    }
  }

  return html.length;
}

function splitTopLevelSegments(html: string): HtmlSegment[] {
  const segments: HtmlSegment[] = [];
  let inlineStart = 0;

  BLOCK_ELEMENT_START_REGEX.lastIndex = 0;

  for (let match = BLOCK_ELEMENT_START_REGEX.exec(html); match !== null; match = BLOCK_ELEMENT_START_REGEX.exec(html)) {
    if (match.index > inlineStart) {
      segments.push({ isBlock: false, value: html.slice(inlineStart, match.index) });
    }

    const isVoidElement = match[2] !== undefined;
    const blockEnd = isVoidElement ? match.index + match[0].length : findClosingTagEnd(html, match[1], match.index + match[0].length);

    segments.push({ isBlock: true, value: html.slice(match.index, blockEnd) });
    inlineStart = blockEnd;
    BLOCK_ELEMENT_START_REGEX.lastIndex = blockEnd;
  }

  if (inlineStart < html.length) {
    segments.push({ isBlock: false, value: html.slice(inlineStart) });
  }

  return segments;
}

function isBlankLine(line: string): boolean {
  return line.replace(INLINE_TAG_REGEX, '').trim() === '';
}

/** Bounded rather than run-to-fixed-point: real markup never nests inline marks anywhere near this deep. */
const MAX_EMPTY_INLINE_STRIP_PASSES = 20;

function stripEmptyInlineElements(line: string): string {
  let stripped = line;

  for (let pass = 0; pass < MAX_EMPTY_INLINE_STRIP_PASSES; pass += 1) {
    const next = stripped.replace(EMPTY_INLINE_ELEMENT_REGEX, '');

    if (next === stripped) {
      break;
    }

    stripped = next;
  }

  return stripped;
}

function buildClosingMarkup(openTags: OpenInlineTag[]): string {
  return [...openTags]
    .reverse()
    .map((tag: OpenInlineTag) => `</${tag.name}>`)
    .join('');
}

function buildReopeningMarkup(openTags: OpenInlineTag[]): string {
  return openTags.map((tag: OpenInlineTag) => tag.markup).join('');
}

/**
 * Splits an inline run at its `<br>` terminators. A `<br>` inside an open inline tag is a hard
 * break and stays in its line, unless it is part of a blank line: then the open tags close before
 * the line ends and reopen on the next one, so the blank line can become a paragraph boundary.
 */
function splitTopLevelLines(inlineRun: string): string[] {
  const openTags: OpenInlineTag[] = [];
  const lines: string[] = [];
  let lineStart = 0;
  let linePrefix = '';
  let breakRun: LineBreakRun | null = null;

  function pushLine(lineBody: string): void {
    lines.push(isBlankLine(lineBody) ? '' : stripEmptyInlineElements(`${linePrefix}${lineBody}${buildClosingMarkup(openTags)}`));
  }

  function flushBreakRun(): void {
    if (breakRun !== null && breakRun.count > 1) {
      pushLine(inlineRun.slice(lineStart, breakRun.start));
      lines.push(...Array.from({ length: breakRun.count - 1 }, () => ''));
      lineStart = breakRun.end;
      linePrefix = buildReopeningMarkup(openTags);
    }

    breakRun = null;
  }

  HTML_TAG_REGEX.lastIndex = 0;

  for (let match = HTML_TAG_REGEX.exec(inlineRun); match !== null; match = HTML_TAG_REGEX.exec(inlineRun)) {
    const tagName = match[1].toLowerCase();
    const isClosingTag = match[0].startsWith('</');
    const tagEnd = match.index + match[0].length;

    if (breakRun !== null && !isBlankLine(inlineRun.slice(breakRun.end, match.index))) {
      flushBreakRun();
    }

    if (tagName === 'br') {
      if (isClosingTag) {
        continue;
      }

      if (openTags.length === 0) {
        pushLine(inlineRun.slice(lineStart, match.index));
        lineStart = tagEnd;
        linePrefix = '';
      } else if (breakRun === null) {
        breakRun = { count: 1, end: tagEnd, start: match.index };
      } else {
        breakRun = { count: breakRun.count + 1, end: tagEnd, start: breakRun.start };
      }
      continue;
    }

    flushBreakRun();

    if (isClosingTag) {
      for (let openTagIndex = openTags.length - 1; openTagIndex >= 0; openTagIndex -= 1) {
        if (openTags[openTagIndex].name === tagName) {
          openTags.splice(openTagIndex);
          break;
        }
      }
      continue;
    }

    if (!match[0].endsWith('/>') && !VOID_HTML_TAGS.has(tagName)) {
      openTags.push({ markup: match[0], name: tagName });
    }
  }

  if (breakRun !== null && breakRun.count === 1 && isBlankLine(inlineRun.slice(breakRun.end))) {
    pushLine(inlineRun.slice(lineStart, breakRun.start));
    lineStart = breakRun.end;
  }

  flushBreakRun();

  const unterminatedLine = inlineRun.slice(lineStart);

  if (!isBlankLine(unterminatedLine)) {
    pushLine(unterminatedLine);
  }

  return lines;
}

function buildEmptyParagraphs(count: number): string[][] {
  return Array.from({ length: count }, (): string[] => []);
}

/**
 * Groups lines into paragraphs: consecutive lines share a paragraph, the first blank line
 * between two paragraphs is their boundary and every other blank line is an empty paragraph.
 */
function groupLinesIntoParagraphs(lines: string[]): string[][] {
  const paragraphs: string[][] = [];
  let currentLines: string[] = [];
  let blankLineCount = 0;

  for (const line of lines) {
    if (isBlankLine(line)) {
      blankLineCount += 1;
      continue;
    }

    if (currentLines.length > 0 && blankLineCount > 0) {
      paragraphs.push(currentLines);
      currentLines = [];
      blankLineCount -= 1;
    }

    paragraphs.push(...buildEmptyParagraphs(blankLineCount));
    blankLineCount = 0;
    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    paragraphs.push(currentLines);
  }

  paragraphs.push(...buildEmptyParagraphs(blankLineCount));

  return paragraphs;
}

function buildParagraph(lines: string[], attributes: string, blockTag: IgntRichTextEditorBlockElement): string {
  const openingTag = attributes === '' ? `<${blockTag}>` : `<${blockTag} ${attributes}>`;
  const content = lines.length === 0 ? EMPTY_PARAGRAPH_CONTENT : lines.join(LINE_TERMINATOR);

  return `${openingTag}${content}</${blockTag}>`;
}

/** `<div>` has no browser margin: every line becomes its own block instead of sharing one with hard breaks. */
function lineToBlock(line: string, attributes: string, blockTag: IgntRichTextEditorBlockElement): string {
  return buildParagraph(line === '' ? [] : [line], attributes, blockTag);
}

function isListSegment(segment: HtmlSegment | undefined): boolean {
  return segment !== undefined && segment.isBlock && LIST_BLOCK_REGEX.test(segment.value);
}

/** A list is closed like a paragraph: the `<br>` right after it is its own terminator, not a blank line, when copy follows. */
function dropListTerminator(lines: string[]): string[] {
  return lines[0] === '' && lines.some((line: string) => line !== '') ? lines.slice(1) : lines;
}

function inlineRunToParagraphs(
  inlineRun: string,
  attributes: string,
  blockTag: IgntRichTextEditorBlockElement,
  followsList = false,
): string {
  const lines = splitTopLevelLines(inlineRun);

  if (blockTag === 'div') {
    return lines.map((line: string) => lineToBlock(line, attributes, blockTag)).join('');
  }

  return groupLinesIntoParagraphs(followsList ? dropListTerminator(lines) : lines)
    .map((paragraphLines: string[]) => buildParagraph(paragraphLines, attributes, blockTag))
    .join('');
}

/** A `<center>` holding inline copy is split into centered paragraphs like any inline run; one wrapping blocks stays a single centered block. */
function centerTagToParagraphs(attributes: string, content: string, blockTag: IgntRichTextEditorBlockElement): string {
  const paragraphAttributes = buildCenteredParagraphAttributes(attributes);

  if (BLOCK_ELEMENT_REGEX.test(content)) {
    return `<${blockTag} ${paragraphAttributes}>${content}</${blockTag}>`;
  }

  const paragraphs = inlineRunToParagraphs(content, paragraphAttributes, blockTag);

  return paragraphs === '' ? buildParagraph([], paragraphAttributes, blockTag) : paragraphs;
}

function canJoinCenterTagRun(
  html: string,
  run: CenterTagRun | undefined,
  attributes: string,
  content: string,
  start: number,
): run is CenterTagRun {
  return (
    run !== undefined &&
    run.attributes === attributes &&
    html.slice(run.end, start).trim() === '' &&
    !BLOCK_ELEMENT_REGEX.test(run.contents[0]) &&
    !BLOCK_ELEMENT_REGEX.test(content)
  );
}

function buildCenterTagRunMarkup(run: CenterTagRun): string {
  const openingTag = run.attributes === '' ? '<center>' : `<center ${run.attributes}>`;
  const lines = run.contents.map((content: string) => content.replace(TRAILING_LINE_TERMINATOR_REGEX, ''));

  return `${openingTag}${joinCenteredLines(lines)}</center>`;
}

/** Joins adjacent inline `<center>` tags into one whose lines are separated by a single terminator; a trailing `<br>` adds no line inside a block. */
function mergeAdjacentCenterTags(html: string): string {
  const runs: CenterTagRun[] = [];

  for (const match of html.matchAll(CENTER_TAG_REGEX)) {
    const [markup, attributes, content] = match;
    const start = match.index;
    const end = start + markup.length;
    const lastRun = runs[runs.length - 1];

    if (canJoinCenterTagRun(html, lastRun, attributes, content, start)) {
      lastRun.contents.push(content);
      lastRun.end = end;
      lastRun.markup = buildCenterTagRunMarkup(lastRun);
    } else {
      runs.push({ attributes, contents: [content], end, markup, start });
    }
  }

  let merged = '';
  let cursor = 0;

  for (const run of runs) {
    merged += `${html.slice(cursor, run.start)}${run.markup}`;
    cursor = run.end;
  }

  return `${merged}${html.slice(cursor)}`;
}

/** Converts stored `<center>` content into markup TipTap can load; `blockTag` must match the consumer's `blockElement` input. */
export function centerTagToRichTextHtml(html: string, blockTag: IgntRichTextEditorBlockElement = DEFAULT_BLOCK_TAG): string {
  const withCenteredImages = html.replace(CENTER_WRAPPED_IMAGE_REGEX, (_match: string, imageTag: string) => buildCenteredImage(imageTag));
  const withCenteredBlocks = mergeAdjacentCenterTags(withCenteredImages)
    .replace(CENTER_TAG_REGEX, (_match: string, attributes: string, content: string) =>
      centerTagToParagraphs(attributes, content, blockTag),
    )
    .replace(
      CENTER_OPENING_TAG_REGEX,
      (_match: string, attributes: string) => `<${blockTag} ${buildCenteredParagraphAttributes(attributes)}>`,
    )
    .replace(CENTER_CLOSING_TAG_REGEX, `</${blockTag}>`);

  return splitTopLevelSegments(withCenteredBlocks)
    .map((segment: HtmlSegment, index: number, segments: HtmlSegment[]) =>
      segment.isBlock ? segment.value : inlineRunToParagraphs(segment.value, '', blockTag, isListSegment(segments[index - 1])),
    )
    .join('');
}

function isCenterAlignedParagraph(attributes: string): boolean {
  return CENTER_ALIGNED_STYLE_REGEX.test(attributes) || CENTER_ALIGNED_QUILL_CLASS_REGEX.test(attributes);
}

/** Whether rich text carries no visible content, so consumers can persist it as empty. */
export function isEmptyRichTextHtml(html: string | null | undefined): boolean {
  if (html === null || html === undefined) {
    return true;
  }

  if (EMBEDDED_CONTENT_REGEX.test(html)) {
    return false;
  }

  return html.replace(HTML_TAG_REGEX, '').replace(NON_BREAKING_SPACE_ENTITY_REGEX, ' ').trim() === '';
}

/** Normalizes TipTap output for persistence: content without visible text becomes `''`, otherwise the trimmed HTML as-is. */
export function normalizeRichTextHtmlForSave(html: string): string {
  return isEmptyRichTextHtml(html) ? '' : html.trim();
}

function parseTopLevelParagraph(segment: HtmlSegment): TopLevelParagraph | null {
  if (!segment.isBlock) {
    return null;
  }

  const match = TOP_LEVEL_PARAGRAPH_REGEX.exec(segment.value);

  if (match === null) {
    return null;
  }

  return {
    content: match[2] === EMPTY_PARAGRAPH_CONTENT ? '' : match[2],
    isCentered: isCenterAlignedParagraph(match[1]),
  };
}

function canJoinParagraphRun(run: TopLevelParagraph[], paragraph: TopLevelParagraph): boolean {
  const lastParagraph = run[run.length - 1];

  return (
    run[0].isCentered === paragraph.isCentered &&
    !BLOCK_ELEMENT_REGEX.test(lastParagraph.content) &&
    !BLOCK_ELEMENT_REGEX.test(paragraph.content)
  );
}

/** Groups adjacent top-level paragraphs sharing an alignment into runs; a paragraph wrapping a block, like any other segment, stands alone. */
function groupParagraphRuns(segments: HtmlSegment[]): (HtmlSegment | TopLevelParagraph[])[] {
  const chunks: (HtmlSegment | TopLevelParagraph[])[] = [];

  for (const segment of segments) {
    const paragraph = parseTopLevelParagraph(segment);

    if (paragraph === null) {
      chunks.push(segment);
      continue;
    }

    const lastChunk = chunks[chunks.length - 1];

    if (Array.isArray(lastChunk) && canJoinParagraphRun(lastChunk, paragraph)) {
      lastChunk.push(paragraph);
    } else {
      chunks.push([paragraph]);
    }
  }

  return chunks;
}

/**
 * Inverse of {@link groupLinesIntoParagraphs}: a run made only of empty paragraphs is that many
 * blank lines, and a blank line between two non-empty paragraphs is their boundary.
 */
function groupedParagraphRunToLines(paragraphs: TopLevelParagraph[]): string[] {
  if (paragraphs.every((paragraph: TopLevelParagraph) => paragraph.content === '')) {
    return paragraphs.map(() => '');
  }

  const lines: string[] = [];

  for (const [index, paragraph] of paragraphs.entries()) {
    if (index > 0) {
      lines.push('');
    }

    if (paragraph.content !== '') {
      lines.push(paragraph.content);
    }
  }

  return lines;
}

/** Every line gets its own terminator, except a non-blank last line, since `</center>` already closes it; a blank one still needs its own. */
function joinCenteredLines(lines: string[]): string {
  return lines
    .map((line: string, index: number) => (index === lines.length - 1 && line !== '' ? line : `${line}${LINE_TERMINATOR}`))
    .join('');
}

/** Inverse of {@link dropListTerminator}: copy following a list gets the list's terminator back. */
function restoreListTerminator(lines: string[]): string[] {
  return lines.some((line: string) => line !== '') ? ['', ...lines] : lines;
}

function paragraphRunToCenterTagHtml(paragraphs: TopLevelParagraph[], followsList: boolean): string {
  const lines = groupedParagraphRunToLines(paragraphs);

  if (paragraphs[0].isCentered) {
    return `<center>${joinCenteredLines(lines)}</center>`;
  }

  return (followsList ? restoreListTerminator(lines) : lines).map((line: string) => `${line}${LINE_TERMINATOR}`).join('');
}

function nestedBlockToCenterTagHtml(block: string): string {
  return block
    .replace(
      LIST_ITEM_PARAGRAPH_REGEX,
      (_match: string, listItemAttributes: string, content: string) => `<li${listItemAttributes}>${content}`,
    )
    .replace(IMAGE_TAG_REGEX, (match: string, attributes: string) => {
      const styleMatch = STYLE_ATTRIBUTE_REGEX.exec(attributes);

      if (!styleMatch || !isCenteredImageStyle(styleMatch[1])) {
        return match;
      }

      const otherAttributes = attributes.replace(styleMatch[0], '').replace(/\s+/gu, ' ').trim();

      return `<center><img${otherAttributes ? ` ${otherAttributes}` : ''}></center>`;
    })
    .replace(PARAGRAPH_REGEX, (_match: string, attributes: string, content: string) => {
      const isEmpty = content === EMPTY_PARAGRAPH_CONTENT;

      if (isCenterAlignedParagraph(attributes)) {
        return isEmpty ? '<center></center>' : `<center>${content}</center>`;
      }

      return isEmpty ? LINE_TERMINATOR : `${content}${LINE_TERMINATOR}`;
    });
}

/** Converts `<p>`-configured TipTap output back into the stored `<center>` format (content without visible text becomes empty). */
export function richTextHtmlToCenterTag(html: string): string {
  if (isEmptyRichTextHtml(html)) {
    return '';
  }

  return groupParagraphRuns(splitTopLevelSegments(html))
    .map((chunk: HtmlSegment | TopLevelParagraph[], index: number, chunks: (HtmlSegment | TopLevelParagraph[])[]) => {
      if (Array.isArray(chunk)) {
        const previousChunk = chunks[index - 1];

        return paragraphRunToCenterTagHtml(chunk, !Array.isArray(previousChunk) && isListSegment(previousChunk));
      }

      return chunk.isBlock ? nestedBlockToCenterTagHtml(chunk.value) : chunk.value;
    })
    .join('');
}
