import { ChangeDetectorRef, Directive, ElementRef, HostListener, Input, OnDestroy } from '@angular/core';

import { NEVER, Observable, of, Subject } from 'rxjs';
import { catchError, filter, finalize, mergeMap, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';

type PageRequestCallback = (page: number) => Observable<boolean | never>;

@Directive({
  selector: '[appInfiniteScrollLoader]',
  standalone: true,
})
export class InfiniteScrollLoaderDirective implements OnDestroy {
  @Input() pageRequestCallback: PageRequestCallback = () => NEVER;
  @Input() set active(value: Observable<boolean>) {
    this.resetInput.next(value ?? of(false));
  }

  /**
   * Opt-in scroll container. When provided, pagination reacts to that element's own scroll
   * (e.g. a scrollable list inside a modal) instead of the window; the default stays window scroll.
   */
  @Input() set scrollContainer(element: HTMLElement | undefined) {
    this.detachContainer?.();
    this.container = element;
    if (element) {
      const onContainerScroll = (): void => this.tryLoadAnotherPage.next();
      element.addEventListener('scroll', onContainerScroll);
      this.detachContainer = () => element.removeEventListener('scroll', onContainerScroll);
    }
  }

  private hasMorePages = false;
  private currentPage = 1;
  private tryLoadAnotherPage = new Subject<void>();
  private destroy$ = new Subject<void>();

  private container: HTMLElement | undefined;
  private detachContainer: (() => void) | undefined;

  private isLoadingNewPage = false;
  private lastRequestIndex = 0;
  private resetInput = new Subject<Observable<boolean>>();

  constructor(
    public element: ElementRef,
    private changeDetectorRef: ChangeDetectorRef,
  ) {
    const startPagination = this.resetInput.pipe(
      switchMap(input => input),
      switchMap(activate => (activate ? of(undefined) : NEVER)),
      shareReplay(1),
    );

    startPagination
      .pipe(
        tap(() => {
          this.resetSearch();
        }),
        switchMap(() => this.addAPage()),
        mergeMap(() => this.listenForNewPageRequests().pipe(mergeMap(() => this.addAPage()))),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.detachContainer?.();
    this.destroy$.next();
  }

  private listenForNewPageRequests() {
    return this.tryLoadAnotherPage.pipe(filter(() => !this.isLoadingNewPage && this.hasReachedTheEnd() && this.hasMorePages));
  }

  private resetSearch() {
    this.currentPage = 1;
    this.hasMorePages = false;
  }

  private getAPage(page: number): Observable<boolean> {
    const thisRequestIndex = ++this.lastRequestIndex;
    this.isLoadingNewPage = true;
    return this.pageRequestCallback(page).pipe(
      finalize(() => {
        if (this.lastRequestIndex === thisRequestIndex) {
          this.isLoadingNewPage = false;
          this.tryLoadAnotherPage.next();
        }
      }),
      catchError(() => {
        this.resetSearch();
        return NEVER;
      }),
    );
  }

  private addAPage() {
    return this.getAPage(this.currentPage).pipe(
      tap(response => this.handleNewShiftPage(response)),
      tap(() => this.currentPage++),
    );
  }

  private handleNewShiftPage(hasMorePages: boolean) {
    this.hasMorePages = hasMorePages;
    this.changeDetectorRef.detectChanges();
  }

  private hasReachedTheEnd(): boolean {
    if (this.container) {
      return this.container.scrollTop + this.container.clientHeight >= this.container.scrollHeight - 1;
    }

    const tableElement = this.element.nativeElement;
    const rect = tableElement.getBoundingClientRect();
    return rect.bottom <= window.innerHeight;
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.tryLoadAnotherPage.next();
  }
}
