import type { JSONContent } from '@tiptap/core';

// The webclient description grammar ((internal repository) render-description-markdown.ts):
// the same line rules and the same four emphasis regexes, applied in the same order.
const UNORDERED_ITEM_PATTERN = /^\s*[-*+]\s+(.*)$/;
const ORDERED_ITEM_PATTERN = /^\s*\d+[.)]\s+(.*)$/;
const BOLD_PATTERNS = [/\*\*(?=\S)(.*?\S)\*\*/g, /__(?=\S)(.*?\S)__/g];
const ITALIC_PATTERNS = [/\*(?=\S)(.*?\S)\*/g, /_(?=\S)(.*?\S)_/g];
// Webclient writes `<strong>` and `<em>` tags between the passes, so each later pass reads them as non-space text.
// These Unicode noncharacters, reserved for internal use, stand in for the four tags one for one.
const BOLD_OPEN = '\u{FDD0}';
const BOLD_CLOSE = '\u{FDD1}';
const ITALIC_OPEN = '\u{FDD2}';
const ITALIC_CLOSE = '\u{FDD3}';
const TAG_SPLIT_PATTERN = /([\u{FDD0}-\u{FDD3}])/u;
const TAG_MARK_PATTERN = /[\u{FDD0}-\u{FDD3}]/gu;
const SPACE_LIKE_PATTERN = /\r\n|[\r\n\u{A0}]/gu;

interface Run {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly text: string;
}

type LineKind = 'blank' | 'bullet' | 'ordered' | 'paragraph';

interface Line {
  readonly kind: LineKind;
  readonly text: string;
}

// The four tag marks never come from the partner, so stored or pasted text cannot use them as formatting.
export function stripTagMarks(text: string): string {
  return text.replace(TAG_MARK_PATTERN, '');
}

// Splits before every item that opens a new group, in one pass.
function groupAdjacent<T>(items: readonly T[], opensGroup: (previous: T, item: T) => boolean): T[][] {
  const starts = items.flatMap((item: T, index: number) => (index === 0 || opensGroup(items[index - 1], item) ? [index] : []));
  return starts.map((start: number, index: number) => items.slice(start, starts.at(index + 1) ?? items.length));
}

function mergeRuns(runs: readonly Run[]): Run[] {
  return groupAdjacent(runs, (previous: Run, run: Run) => previous.bold !== run.bold || previous.italic !== run.italic).map(
    (group: Run[]) => ({ ...group[0], text: group.map((run: Run) => run.text).join('') }),
  );
}

// A browser nests a tag inside one of its own type and rebuilds misnested ones (`***x***` gives
// `<strong><em>x</strong></em>`), so a format holds while any of its tags is open; a stray close tag is ignored.
function* readMarkedRuns(marked: string): Generator<Run> {
  let boldDepth = 0;
  let italicDepth = 0;
  for (const part of marked.split(TAG_SPLIT_PATTERN)) {
    if (part === BOLD_OPEN || part === BOLD_CLOSE) {
      boldDepth = part === BOLD_OPEN ? boldDepth + 1 : Math.max(boldDepth - 1, 0);
    } else if (part === ITALIC_OPEN || part === ITALIC_CLOSE) {
      italicDepth = part === ITALIC_OPEN ? italicDepth + 1 : Math.max(italicDepth - 1, 0);
    } else if (part !== '') {
      yield { bold: boldDepth > 0, italic: italicDepth > 0, text: part };
    }
  }
}

function readInline(text: string): JSONContent[] {
  let marked = text;
  for (const pattern of BOLD_PATTERNS) {
    marked = marked.replace(pattern, `${BOLD_OPEN}$1${BOLD_CLOSE}`);
  }
  for (const pattern of ITALIC_PATTERNS) {
    marked = marked.replace(pattern, `${ITALIC_OPEN}$1${ITALIC_CLOSE}`);
  }

  return mergeRuns([...readMarkedRuns(marked)]).map((run: Run) => {
    const marks = [...(run.bold ? [{ type: 'bold' }] : []), ...(run.italic ? [{ type: 'italic' }] : [])];
    return marks.length === 0 ? { text: run.text, type: 'text' } : { marks, text: run.text, type: 'text' };
  });
}

function paragraphOf(text: string): JSONContent {
  return { content: readInline(text), type: 'paragraph' };
}

function readLine(line: string): Line {
  const unordered = UNORDERED_ITEM_PATTERN.exec(line);
  const itemText = (unordered ?? ORDERED_ITEM_PATTERN.exec(line))?.[1].trim() ?? '';

  if (line.trim() === '') {
    return { kind: 'blank', text: '' };
  }
  if (itemText === '') {
    return { kind: 'paragraph', text: line.trim() };
  }
  return { kind: unordered === null ? 'ordered' : 'bullet', text: itemText };
}

// Consecutive lines of one kind form one block, so a blank line, a paragraph line or an item of the other kind ends a list.
function blockOf(lines: readonly Line[]): JSONContent[] {
  const texts = lines.map((line: Line) => line.text);

  switch (lines[0].kind) {
    case 'paragraph':
      return [paragraphOf(texts.join(' '))];
    case 'bullet':
    case 'ordered':
      return [
        {
          content: texts.map((item: string) => ({ content: [paragraphOf(item)], type: 'listItem' })),
          type: lines[0].kind === 'ordered' ? 'orderedList' : 'bulletList',
        },
      ];
    default:
      return [];
  }
}

export function descriptionMarkdownToDoc(text: string): JSONContent {
  const lines = stripTagMarks(text).replace(/\r\n?/g, '\n').split('\n').map(readLine);
  const blocks = groupAdjacent(lines, (previous: Line, line: Line) => previous.kind !== line.kind).flatMap(blockOf);

  return { content: blocks.length === 0 ? [{ type: 'paragraph' }] : blocks, type: 'doc' };
}

function readRuns(paragraph: JSONContent): Run[] {
  return (paragraph.content ?? [])
    .filter((node: JSONContent) => node.type === 'text')
    .map((node: JSONContent) => {
      const marks = (node.marks ?? []).map((mark: { type: string }) => mark.type);
      return { bold: marks.includes('bold'), italic: marks.includes('italic'), text: (node.text ?? '').replace(SPACE_LIKE_PATTERN, ' ') };
    })
    .filter((run: Run) => run.text !== '');
}

// Whitespace at the edge goes outside the markers: the grammar would not read `**early **` as bold.
function wrap(value: string, marker: string): string {
  const core = value.trim();
  if (core === '') {
    return value;
  }
  const start = value.indexOf(core);
  return `${value.slice(0, start)}${marker}${core}${marker}${value.slice(start + core.length)}`;
}

// Bold spans are maximal and outermost, so italic inside them is written `_x_` and reads back inside the same bold pair.
function writeParagraph(paragraph: JSONContent): string {
  const runs = mergeRuns(readRuns(paragraph));
  let markdown = '';
  let bold = '';

  for (const [index, run] of runs.entries()) {
    if (run.bold) {
      bold += run.italic ? wrap(run.text, '_') : run.text;
      if (runs[index + 1]?.bold !== true) {
        markdown += wrap(bold, '**');
        bold = '';
      }
    } else {
      markdown += run.italic ? wrap(run.text, '*') : run.text;
    }
  }

  return markdown.trim();
}

function writeBlock(block: JSONContent): string {
  if (block.type === 'paragraph') {
    return writeParagraph(block);
  }
  // A list item holds exactly one paragraph.
  const items = (block.content ?? [])
    .map((item: JSONContent) => writeParagraph(item.content?.[0] ?? {}))
    .filter((itemText: string) => itemText !== '');

  switch (block.type) {
    case 'bulletList':
      return items.map((itemText: string) => `- ${itemText}`).join('\n');
    case 'orderedList':
      return items.map((itemText: string, index: number) => `${index + 1}. ${itemText}`).join('\n');
    default:
      return '';
  }
}

export function docToDescriptionMarkdown(doc: JSONContent): string {
  return (doc.content ?? [])
    .map(writeBlock)
    .filter((blockText: string) => blockText !== '')
    .join('\n\n');
}

export function canonicaliseDescriptionMarkdown(text: string): string {
  return docToDescriptionMarkdown(descriptionMarkdownToDoc(text));
}
