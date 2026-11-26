import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SessionAvailabilitySummaryByDatetime } from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-datetime.model';

import { DateSelectorComponent, TimeRangeSection } from '../../../../../shared/components/date-selector/date-selector.component';
import { RegularSessionAvailabilitySummaryByDate } from '../../../../../shared/models/session-availability/regular-session-availability-summary-by-date.model';
import { FeatureFlags } from '../../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../../shared/optimizely/optimizely.service';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { KioskStateService } from '../../../services/kiosk-state/kiosk-state.service';

/**
 * Section evaluation order for the continuous hour strip (B2BO-7587). Night only carries
 * sessions in the legacy grouping; in operatingDay grouping (B2BO-7586) it stays empty and is
 * filtered out of {@link DateSelectorKioskComponent.visibleSections}. Never assume a fixed count.
 */
const SECTION_ORDER: readonly TimeRangeSection[] = ['morning', 'afternoon', 'evening', 'night'];

/**
 * Fraction of the strip width that a section's leading anchor must cross (from the start edge) for
 * that section to become the active one — i.e. a section takes over the tab once its start passes
 * the viewport centre. Reacting to a scroll position (not a discrete edge event) keeps a momentum
 * fling from skipping a section. The last section is narrower than the viewport and can never reach
 * this line, so end-of-strip explicitly selects it (see the atEnd clamp in the sync).
 *
 * @todo B2BO-7587 — confirm the trigger position / feel against the interactive mock.
 */
const SECTION_SYNC_LEADING_RATIO = 0.5;

/** Window after a tab-click programmatic scroll during which scroll-spy sync is suppressed. */
const PROGRAMMATIC_SCROLL_SETTLE_MS = 500;

@Component({
  selector: 'date-selector-kiosk',
  standalone: false,
  styleUrls: ['../../../../../shared/components/common/styles/date-selector-common.scss', './date-selector-kiosk.component.scss'],
  templateUrl: './date-selector-kiosk.component.html',
})
export class DateSelectorKioskComponent extends DateSelectorComponent implements OnChanges, AfterViewInit, OnDestroy {
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #kioskStateService = inject(KioskStateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #ngZone = inject(NgZone);
  @Input() showLoadMoreButton = false;
  @Input() selectedSession: RegularSessionAvailabilitySummaryByDate | null = null;

  @ViewChild('scrollContainer', { read: ElementRef }) scrollContainer!: ElementRef;
  @ViewChild('hoursStrip', { read: ElementRef }) hoursStrip?: ElementRef<HTMLElement>;
  @ViewChildren('sectionAnchor', { read: ElementRef }) sectionAnchors?: QueryList<ElementRef<HTMLElement>>;

  activeTab: TimeRangeSection = 'morning';
  visibleSections: TimeRangeSection[] = [];
  protected hideSingleSessionStartTime = false;

  #scrolledStrip: HTMLElement | null = null;
  #suppressSectionSync = false;
  #suppressSyncTimer: ReturnType<typeof setTimeout> | null = null;
  #pendingSyncFrame: number | null = null;

  clickOnLoadMore() {
    this.loadMore.emit();

    // as we cannot control when the changes in the array of dates occurs, because they occur multiple times
    // we need to do this here
    this.scrollToEnd();
  }

  // Loaded day when the parent has no confirmed datetime (sold-out: we must not emit a selection).
  protected get hoursSession(): RegularSessionAvailabilitySummaryByDate | null {
    return this.selectedSession ?? this.regularSessionAvailabilitySummaryByDate[0] ?? null;
  }

  // The continuous strip (B2BO-7587) rides the operating-day grouping flag (B2BO-7586).
  get isOperatingDayGrouping(): boolean {
    return this.hoursSession?.groupingMode === 'operatingDay';
  }

  get isSessionsShortList(): boolean {
    return (this.hoursSession?.sessionAvailabilityByDatetimeList?.length ?? 0) <= 10;
  }

  isTabSelected(timeRangeSection: TimeRangeSection): boolean {
    return timeRangeSection == this.activeTab;
  }

  ngAfterViewInit(): void {
    // (Re)wire the scroll-spy whenever the strip's section anchors change (new date / grouping).
    this.sectionAnchors?.changes.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#attachScrollSpy());
    this.#attachScrollSpy();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedSession?.currentValue) {
      this.activeTab = this.calculateTimeRangeFrom(changes.selectedSession.currentValue);
    }

    // Continuous strip (operating-day): realign only on a genuine session/day change. A
    // document-wide scroll-to-first on every ngOnChanges would yank the strip back to the first
    // section after the user scrolled to (or opened) a later one — the tab-click path already
    // special-cases continuous mode. Legacy tab-switch keeps its per-change behaviour.
    if (!this.isOperatingDayGrouping || changes.selectedSession?.currentValue) {
      this.scrollToFirstAvailableHour();
    }

    super.ngOnChanges(changes);

    // After super: the day-refresh auto-select assigns selectedSession inside the base, so
    // deriving these before super would snapshot a stale (empty) strip.
    this.#refreshVisibleSections();
    this.#resolveHideSingleSessionStartTime();
  }

  ngOnDestroy(): void {
    if (this.#pendingSyncFrame !== null) {
      cancelAnimationFrame(this.#pendingSyncFrame);
      this.#pendingSyncFrame = null;
    }
    if (this.#suppressSyncTimer !== null) {
      clearTimeout(this.#suppressSyncTimer);
      this.#suppressSyncTimer = null;
    }
    this.#scrolledStrip?.removeEventListener('scroll', this.#onStripScroll);
    this.#scrolledStrip = null;
  }

  scrollToEnd() {
    const dateSelector = this.scrollContainer?.nativeElement;
    if (dateSelector) {
      setTimeout(() => {
        const lastElement = dateSelector.lastElementChild;
        lastElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 500);
    }
  }

  scrollToFirstAvailableHour() {
    if (this.selectedSession) {
      setTimeout(() => {
        const sessions: SessionAvailabilitySummaryByDatetime[] = this.selectedSession?.sessionAvailabilityByDatetimeList ?? [];

        const firstAvailableHour: SessionAvailabilitySummaryByDatetime | null = this.getFirstAvailableHour(sessions);

        if (firstAvailableHour !== null) {
          const element: HTMLElement | null = document.querySelector(`[data-hour="${firstAvailableHour.datetime}"]`);
          if (element !== null) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
          }
        }
      }, 100);
    }
  }

  sessionsForSection(timeRangeSection: TimeRangeSection): SessionAvailabilitySummaryByDatetime[] {
    switch (timeRangeSection) {
      case 'morning':
        return this.hoursSession?.morningSessions ?? [];
      case 'afternoon':
        return this.hoursSession?.afternoonSessions ?? [];
      case 'evening':
        return this.hoursSession?.eveningSessions ?? [];
      case 'night':
        return this.hoursSession?.nightSessions ?? [];
    }
  }

  toggleTimeRangeSection(timeRangeSection: TimeRangeSection): void {
    this.activeTab = timeRangeSection;

    if (this.selectedSession && !this.isSessionsShortList) {
      const firstAvailableHour: SessionAvailabilitySummaryByDatetime | null = this.getFirstAvailableHour(
        this.sessionsForSection(timeRangeSection),
      );
      if (firstAvailableHour !== null) {
        this.selectHour(firstAvailableHour);
      }

      if (this.isOperatingDayGrouping) {
        this.#scrollSectionIntoView(timeRangeSection);
      } else {
        this.scrollToFirstAvailableHour();
      }
    }
  }

  trackBySection(_index: number, timeRangeSection: TimeRangeSection): TimeRangeSection {
    return timeRangeSection;
  }

  #anchorFor(timeRangeSection: TimeRangeSection): HTMLElement | undefined {
    return this.sectionAnchors?.toArray().find(ref => ref.nativeElement.getAttribute('data-section') === timeRangeSection)?.nativeElement;
  }

  #attachScrollSpy(): void {
    const strip: HTMLElement | null = this.hoursStrip?.nativeElement ?? null;
    if (strip === this.#scrolledStrip) {
      // Strip reused across a day change → scrollLeft is stale; reset it. Defer the re-sync:
      // anchors.changes fires mid-CD, so mutating activeTab synchronously would throw NG0100.
      if (strip !== null) {
        strip.scrollLeft = 0;
      }
      this.#scheduleSync();
      return;
    }
    this.#scrolledStrip?.removeEventListener('scroll', this.#onStripScroll);
    this.#scrolledStrip = strip;
    if (strip !== null) {
      // Register outside Angular's zone so scroll ticks don't trigger app-wide change detection;
      // the sync re-enters the zone only when the active section actually changes.
      this.#ngZone.runOutsideAngular(() => strip.addEventListener('scroll', this.#onStripScroll, { passive: true }));
      this.#syncActiveSectionFromScroll();
    }
  }

  #onStripScroll = (): void => {
    this.#scheduleSync();
  };

  // Coalesce scroll bursts into one sync per frame (no getBoundingClientRect thrash), off the CD pass.
  #scheduleSync(): void {
    if (this.#pendingSyncFrame !== null) {
      return;
    }
    this.#pendingSyncFrame = requestAnimationFrame(() => {
      this.#pendingSyncFrame = null;
      this.#syncActiveSectionFromScroll();
    });
  }

  #computeHideSingleSessionStartTime(): boolean {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined || partnerId === null) {
      return false;
    }
    if ((this.selectedSession?.sessionAvailabilityByDatetimeList?.length ?? 0) !== 1) {
      return false;
    }
    return (
      this.#optimizelyService.isFeatureEnabled(FeatureFlags.KIOSK_HIDE_SINGLE_SESSION_START_TIME, {
        partner_id: partnerId.toString(),
      }) ?? false
    );
  }

  #refreshVisibleSections(): void {
    this.visibleSections = SECTION_ORDER.filter(section => this.sessionsForSection(section).length > 0);
  }

  #resolveHideSingleSessionStartTime(): void {
    this.hideSingleSessionStartTime = this.#computeHideSingleSessionStartTime();
    this.#kioskStateService.updateStateProp('hideSingleSessionStartTime', this.hideSingleSessionStartTime);
  }

  #scrollSectionIntoView(timeRangeSection: TimeRangeSection): void {
    const anchor: HTMLElement | undefined = this.#anchorFor(timeRangeSection);
    if (anchor === undefined) {
      return;
    }

    // Suppress scroll-spy while the programmatic scroll settles so it doesn't fight the tap. Cancel
    // a prior settle timer first, or a rapid second tap lets the older one un-suppress mid-scroll.
    this.#suppressSectionSync = true;
    if (this.#suppressSyncTimer !== null) {
      clearTimeout(this.#suppressSyncTimer);
    }
    const prefersReducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    anchor.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'start' });
    this.#suppressSyncTimer = setTimeout(() => {
      this.#suppressSectionSync = false;
      this.#suppressSyncTimer = null;
    }, PROGRAMMATIC_SCROLL_SETTLE_MS);
  }

  #syncActiveSectionFromScroll(): void {
    if (this.#suppressSectionSync) {
      return;
    }
    const strip: HTMLElement | undefined = this.hoursStrip?.nativeElement;
    // clientWidth 0 = not laid out yet (or non-visual test env): nothing to measure, keep the tab.
    if (strip === undefined || this.visibleSections.length === 0 || strip.clientWidth === 0) {
      return;
    }
    const stripLeft: number = strip.getBoundingClientRect().left;
    const triggerLine: number = strip.clientWidth * SECTION_SYNC_LEADING_RATIO;
    const atEnd: boolean = strip.scrollWidth > strip.clientWidth && strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 1;

    let active: TimeRangeSection | null = null;
    for (const section of this.visibleSections) {
      const anchor: HTMLElement | undefined = this.#anchorFor(section);
      // Furthest section whose start has crossed the trigger line wins.
      if (anchor !== undefined && anchor.getBoundingClientRect().left - stripLeft <= triggerLine) {
        active = section;
      }
    }
    // Last section is narrower than the viewport and never reaches the trigger line — the end of the
    // strip explicitly selects it (classic scroll-spy last-item fix).
    if (atEnd) {
      active = this.visibleSections[this.visibleSections.length - 1];
    }
    // Re-enter the zone only when the active section changes (the listener runs outside it).
    if (active !== null && active !== this.activeTab) {
      this.#ngZone.run(() => (this.activeTab = active));
    }
  }

  private calculateTimeRangeFrom(selectedSession: RegularSessionAvailabilitySummaryByDate): TimeRangeSection {
    if (this.isSelectedSessionInHoursRange(selectedSession.nightSessions)) {
      return 'night';
    } else if (this.isSelectedSessionInHoursRange(selectedSession.afternoonSessions)) {
      return 'afternoon';
    } else if (this.isSelectedSessionInHoursRange(selectedSession.eveningSessions)) {
      return 'evening';
    } else {
      return 'morning';
    }
  }
}
