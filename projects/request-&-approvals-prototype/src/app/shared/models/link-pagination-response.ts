import { BaseErrorResponse } from './base-response';
import { LinkHeader } from './link-header';

export class LinkPaginationResponse<T> {
  private readonly headers: LinkHeader;

  constructor(
    private link: string | null,
    public data: T | null,
    public error: BaseErrorResponse | null,
    public totalCount: number | null = null,
  ) {
    this.headers = this.getParsedLinkHeader(this.link);
  }

  getFirstPageUrl(): string | null {
    return this.headers.first;
  }

  getLastPageUrl(): string | null {
    return this.headers.last;
  }

  getLastPaginationPage(): number | null {
    return this.extractPage(this.headers.last);
  }

  getNextPageUrl(): string | null {
    return this.headers.next;
  }

  getNextPaginationItemsPerPage(): number | null {
    return this.extractItemsPerPage(this.headers.next);
  }

  getNextPaginationPage(): number | null {
    return this.extractPage(this.headers.next);
  }

  getNextPaginationQueryString(): string | null {
    let queryString: string | null = null;
    if (this.headers.next) {
      const itemsPerPage: string | null = this.headers?.next?.match('items_per_page=([^&]+)')
        ? (this.headers.next.match('items_per_page=([^&]+)')?.[0] ?? null)
        : null;
      const page: string | null = this.headers?.next?.match('&page=([^&]+)')
        ? (this.headers.next.match('&page=([^&]+)')?.[0] ?? null)
        : null;
      queryString = `${itemsPerPage ? itemsPerPage : ''}${page ? page : ''}`;
    }
    return queryString;
  }

  getPreviousPageUrl(): string | null {
    return this.headers.prev;
  }

  getPreviousPaginationPage(): number | null {
    return this.extractPage(this.headers.prev);
  }

  private extractItemsPerPage(url: string | null): number | null {
    if (!url) return null;

    const itemsPerPageMatchArray = url.match('items_per_page=([^&]+)');
    const itemsPerPageString = itemsPerPageMatchArray ? itemsPerPageMatchArray[0].split('=') : null;
    return itemsPerPageString ? Number(itemsPerPageString[1]) : null;
  }

  private extractPage(url: string | null): number | null {
    if (!url) return null;

    let pageMatchArray = url.match('&page=([^&]+)');
    pageMatchArray = pageMatchArray ? pageMatchArray : url.match('/?page=([^&]+)');
    const pageString = pageMatchArray ? pageMatchArray[0].split('=') : null;
    return pageString ? Number(pageString[1]) : null;
  }

  private getLinkUrl(linkSegmentsArray: string[], linkSegmentName: string): string | null {
    const linkSegment: string | undefined = linkSegmentsArray.find(element => element.includes(linkSegmentName));
    if (!linkSegment) {
      return null;
    }
    return linkSegment
      .split(';')[0]
      .replace(/<(.*)>/, '$1')
      .trim();
  }

  private getParsedLinkHeader(header: string | null): LinkHeader {
    if (!header || header.length == 0) {
      return new LinkHeader(null, null, null, null);
    }
    const parts = header.split(',');
    return new LinkHeader(
      this.getLinkUrl(parts, 'next'),
      this.getLinkUrl(parts, 'prev'),
      this.getLinkUrl(parts, 'first'),
      this.getLinkUrl(parts, 'last'),
    );
  }
}
