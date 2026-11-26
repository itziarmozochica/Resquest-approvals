import { ApprovalItemComment, ApprovalItemCommentSegment, ApprovalMentionable } from '../models/approval-item-comment.model';

export interface CommentMentionQuery {
  start: number;
  query: string;
}

export interface CommentMentionInsertion {
  text: string;
  caret: number;
}

const maxMentionQueryLength = 64;
const mentionStart = '(?<=^|\\s)';
const mentionEnd = '(?=$|[^\\p{L}\\p{N}]|[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}])';

export function upsertComments(comments: ApprovalItemComment[], additions: ApprovalItemComment[]): ApprovalItemComment[] {
  const byId = new Map(comments.map(comment => [comment.id, comment]));
  additions.forEach(comment => byId.set(comment.id, comment));
  return [...byId.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function mergeLocalComments(loaded: ApprovalItemComment[], local: readonly ApprovalItemComment[]): ApprovalItemComment[] {
  const loadedById = new Map(loaded.map(comment => [comment.id, comment]));
  const newerLocal = local.filter(comment => {
    const server = loadedById.get(comment.id);
    return server === undefined || lastChange(comment) > lastChange(server);
  });
  return upsertComments(loaded, newerLocal);
}

export function commentInitials(name: string, email: string): string {
  const trimmedName = name.trim();
  const source = trimmedName && trimmedName !== email.trim() ? trimmedName : email.split('@')[0];
  const words = source.split(/[\s._-]+/).filter(word => word.length > 0);
  if (words.length === 0) {
    return '?';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function findMentionQuery(text: string, caret: number): CommentMentionQuery | null {
  const beforeCaret = text.slice(0, caret);
  const start = beforeCaret.lastIndexOf('@');
  if (start < 0 || (start > 0 && !/\s/.test(beforeCaret[start - 1]))) {
    return null;
  }
  const query = beforeCaret.slice(start + 1);
  if (query.includes('\n') || query.length > maxMentionQueryLength) {
    return null;
  }
  return { start, query };
}

export function filterMentionables(people: ApprovalMentionable[], query: string): ApprovalMentionable[] {
  const needle = query.toLowerCase();
  return people.filter(person => person.name.toLowerCase().includes(needle) || person.email.toLowerCase().includes(needle));
}

export function insertMention(text: string, mention: CommentMentionQuery, name: string): CommentMentionInsertion {
  const end = mention.start + 1 + mention.query.length;
  const inserted = `@${name} `;
  return {
    text: `${text.slice(0, mention.start)}${inserted}${text.slice(end)}`,
    caret: mention.start + inserted.length,
  };
}

export function mentionedEmailsIn(body: string, selected: ReadonlyMap<string, string>): string[] {
  const names = [...new Set(selected.values())].filter(name => name.length > 0).sort((a, b) => b.length - a.length);
  if (names.length === 0) {
    return [];
  }
  const pattern = mentionPattern(names);
  const mentioned = new Set([...body.matchAll(pattern)].map(match => match[0].slice(1)));
  return [...selected].filter(([, name]) => mentioned.has(name)).map(([email]) => email);
}

export function splitMentionSegments(body: string, names: string[]): ApprovalItemCommentSegment[] {
  const candidates = [...new Set(names.map(name => name.trim()).filter(name => name.length > 0))].sort((a, b) => b.length - a.length);
  if (candidates.length === 0) {
    return [{ text: body, mention: false }];
  }
  const pattern = mentionPattern(candidates);
  const segments: ApprovalItemCommentSegment[] = [];
  let cursor = 0;
  for (const match of body.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      segments.push({ text: body.slice(cursor, index), mention: false });
    }
    segments.push({ text: match[0], mention: true });
    cursor = index + match[0].length;
  }
  if (cursor < body.length) {
    segments.push({ text: body.slice(cursor), mention: false });
  }
  return segments;
}

function lastChange(comment: ApprovalItemComment): number {
  return (comment.editedAt ?? comment.createdAt).getTime();
}

function mentionPattern(names: string[]): RegExp {
  return new RegExp(`${mentionStart}@(?:${names.map(escapeRegExp).join('|')})${mentionEnd}`, 'gu');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normaliseCommentEmail(email: string): string {
  return email.trim().toLowerCase();
}
