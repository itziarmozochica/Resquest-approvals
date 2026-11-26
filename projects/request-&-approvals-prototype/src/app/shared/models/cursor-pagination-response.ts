import { BaseErrorResponse } from './base-response';

export class CursorPaginationResponse<T> {
  constructor(
    public cursor: string | null,
    public data: T | null,
    public error: BaseErrorResponse | null,
    public totalCount: number | null = null,
  ) {}

  getNextCursor(): string | null {
    return this.cursor;
  }

  getTotalCount(): number | null {
    return this.totalCount;
  }

  hasNextPage(): boolean {
    return Boolean(this.cursor);
  }
}
