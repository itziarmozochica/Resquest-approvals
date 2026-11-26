import { NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { ProductSession } from '@fz-original/app/shared/models/product-sessions-summary/product-sessions-summary-response.model';
import { ProductSessionsSummaryService } from '@fz-original/app/shared/services/product-sessions-summary/product-sessions-summary.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

import { OssSearchTableComponent } from '../../components/oss-search-table/oss-search-table.component';
import { posSearchClosed } from '../../tracking/events/pos-search-closed.event';
import { posSearchFunction } from '../../tracking/events/pos-search-function.event';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    NgClass,
    NgStyle,
    OssSearchTableComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-oss-search',
  standalone: true,
  styleUrls: ['./oss-search.component.scss'],
  templateUrl: './oss-search.component.html',
})
export class OssSearchComponent {
  #destroyRef = inject(DestroyRef);
  #fzTracking = inject(FzTrackingService);
  #productSessionsSummaryService = inject(ProductSessionsSummaryService);

  animationState: WritableSignal<'entering' | 'visible' | 'leaving' | 'hidden'> = signal('hidden');
  buttonPosition: WritableSignal<{ x: number; y: number } | null> = signal(null);
  @Output() closeSearch = new EventEmitter<void>();
  @Input() isMobile = false;
  isSearching: WritableSignal<boolean> = signal(false);
  @Input({ required: true }) locale = '';
  @ViewChild('searchContainer', { static: true }) searchContainer!: ElementRef<HTMLDivElement>;
  searchFormControl = new FormControl('');
  @ViewChild('searchInput', { static: false }) searchInput!: IgntInputFieldComponent;
  searchResults: WritableSignal<ProductSession[]> = signal([]);
  @Output() sessionSelected = new EventEmitter<ProductSession>();

  constructor() {
    this.searchFormControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        map(term => term?.trim() || ''),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(term => {
        if (term.length < 2) {
          this.searchResults.set([]);
          this.isSearching.set(false);
          return;
        }

        this.isSearching.set(true);
        const results = this.#productSessionsSummaryService.searchAllSessions(term);
        this.searchResults.set(results);
        this.isSearching.set(false);
        this.#trackSearchFunction(term);
      });
  }
  clearResults() {
    this.searchResults.set([]);
    this.isSearching.set(false);
    this.searchFormControl.reset();
  }

  getAnimationStyles(): { [key: string]: string } {
    const position = this.buttonPosition();
    if (!position) {
      return {};
    }

    return {
      '--button-x': `${position.x}%`,
      '--button-y': `${position.y}%`,
    };
  }

  hide(): void {
    this.#fzTracking.track(posSearchClosed());

    if (this.isMobile) {
      this.animationState.set('hidden');
      this.clearResults();
      this.closeSearch.emit();
      return;
    }

    this.animationState.set('leaving');

    setTimeout(() => {
      this.animationState.set('hidden');
      this.clearResults();
      this.closeSearch.emit();
    }, 300);
  }

  onClose(): void {
    this.hide();
  }

  onSessionSelect(session: ProductSession): void {
    this.sessionSelected.emit(session);
  }

  show(buttonRect: DOMRect): void {
    if (this.isMobile) {
      this.animationState.set('visible');
      this.#focusSearchInput();
      return;
    }

    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const buttonCenterY = buttonRect.top + buttonRect.height / 2;

    const overlayElement = this.searchContainer.nativeElement.parentElement;
    if (!overlayElement) return;
    const containerRect = overlayElement.getBoundingClientRect();

    let relativeXPercent = ((buttonCenterX - containerRect.left) / containerRect.width) * 100;
    let relativeYPercent = ((buttonCenterY - containerRect.top) / containerRect.height) * 100;

    relativeXPercent = Math.max(5, Math.min(95, relativeXPercent));
    relativeYPercent = Math.max(5, Math.min(95, relativeYPercent));

    this.buttonPosition.set({ x: relativeXPercent, y: relativeYPercent });
    this.animationState.set('entering');

    setTimeout(() => {
      this.animationState.set('visible');
      this.#focusSearchInput();
    }, 400);
  }

  #focusSearchInput(): void {
    if (this.searchInput?.inputElement?.nativeElement) {
      this.searchInput.inputElement.nativeElement.focus();
    }
  }

  #trackSearchFunction(searchQuery: string): void {
    this.#fzTracking.track(
      posSearchFunction({
        resultCount: this.searchResults().length,
        searchQuery,
      }),
    );
  }
}
