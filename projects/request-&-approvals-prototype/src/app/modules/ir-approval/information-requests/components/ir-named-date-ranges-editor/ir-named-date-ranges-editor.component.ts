import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { FzWizardStepperComponent } from '@fz-original/app/modules/ir-approval/shared/components/fz-wizard-stepper/fz-wizard-stepper.component';
import { WizardStepView } from '@fz-original/app/modules/ir-approval/shared/models/fz-wizard-stepper.model';
import { TranslateModule } from '@ngx-translate/core';

import {
  collectOpenYmdsForNamedRange,
  eachDayInclusiveYmd,
  namedRangeCalendarEnvelope,
  namedRangeComplete,
  namedRangeIdentityComplete,
  namedRangeInclusiveSpans,
  namedRangeTicketsComplete,
  namedRangeWeekdayOpen,
  namedRangeWeekdaysComplete,
  parseSelectedProductIds,
  ticketProductsForNamedRange,
  ymdInInclusiveSpan,
} from '../../models/event-schedule-composer-v1.helpers';
import {
  defaultNamedDateRange,
  EventScheduleComposerStateV1,
  NamedDateRangeV1,
  ProductRow,
} from '../../models/event-schedule-composer-v1.model';
import { IrScheduleWizardStepIdentityComponent } from '../ir-schedule-wizard-step-identity/ir-schedule-wizard-step-identity.component';
import { IrScheduleWizardStepTicketsComponent } from '../ir-schedule-wizard-step-tickets/ir-schedule-wizard-step-tickets.component';
import { IrScheduleWizardStepWeekdaysComponent } from '../ir-schedule-wizard-step-weekdays/ir-schedule-wizard-step-weekdays.component';
import { VenueAnswer } from '../ir-venue-answer/ir-venue-answer.component';

type WizardStep = 'identity' | 'tickets' | 'weekdays';

interface BandSummary {
  id: string;
  name: string;
  range: string;
  openDays: number;
  segments: number;
  sessions: number;
  statusKey: string;
  ticketCount: number;
}

/**
 * Host editor for event-schedule named date ranges (bands): lists configured bands and opens a
 * step-by-step modal wizard (identity → weekdays) to add or edit one. Emits the updated composer.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    FzWizardStepperComponent,
    IrScheduleWizardStepIdentityComponent,
    IrScheduleWizardStepTicketsComponent,
    IrScheduleWizardStepWeekdaysComponent,
  ],
  selector: 'app-ir-named-date-ranges-editor',
  standalone: true,
  styleUrls: ['./ir-named-date-ranges-editor.component.scss'],
  templateUrl: './ir-named-date-ranges-editor.component.html',
})
export class IrNamedDateRangesEditorComponent {
  readonly composer = input.required<EventScheduleComposerStateV1>();
  readonly allProducts = input<ProductRow[]>([]);
  readonly venueEnabled = input<boolean>(false);
  readonly venueValue = input<VenueAnswer | null>(null);
  readonly composerChange = output<EventScheduleComposerStateV1>();
  readonly venueChange = output<VenueAnswer>();

  readonly currentStep = signal<WizardStep>('identity');
  readonly editingBand = signal<NamedDateRangeV1 | null>(null);

  readonly otherBandsUsedYmds = computed<string[]>(() => {
    const editingId = this.editingBand()?.id;
    const ymdsOf = (band: NamedDateRangeV1): string[] => {
      const segments = band.rangeSegments?.length
        ? band.rangeSegments
        : band.rangeStart && band.rangeEnd
          ? [{ end: band.rangeEnd, start: band.rangeStart }]
          : [];
      const excluded = new Set(band.excludedDates ?? []);
      return segments
        .filter(s => s.start && s.end)
        .flatMap(s => eachDayInclusiveYmd(String(s.start), String(s.end)))
        .filter(ymd => !excluded.has(ymd));
    };
    return (this.composer().namedDateRanges ?? []).filter(band => band.id !== editingId).flatMap(ymdsOf);
  });
  readonly newRangeChoiceOpen = signal<boolean>(false);
  readonly newRangeCopySourceId = signal<string>('');
  readonly newRangeMode = signal<'copy' | 'scratch'>('scratch');
  readonly finishValidationAttempted = signal<boolean>(false);
  readonly validationAttemptedSteps = signal<WizardStep[]>([]);

  readonly steps = computed<WizardStep[]>(() => ['identity', 'tickets', 'weekdays']);

  readonly bands = computed<BandSummary[]>(() =>
    (this.composer().namedDateRanges ?? [])
      .filter(b => namedRangeInclusiveSpans(b).length > 0 || (b.name ?? '').trim())
      .map(b => {
        const env = namedRangeCalendarEnvelope(b);
        return {
          id: b.id,
          name: b.name?.trim() || '—',
          openDays: collectOpenYmdsForNamedRange(b).length,
          range: env ? `${env.start} → ${env.end}` : '',
          segments: namedRangeInclusiveSpans(b).length,
          sessions: Object.values(b.dowSlots ?? {}).reduce((n, slots) => n + slots.length, 0),
          statusKey: namedRangeComplete(b, this.allProducts())
            ? 'informationRequests.schedule.status.ready'
            : 'informationRequests.schedule.status.draft',
          ticketCount: parseSelectedProductIds(b.bandTicketTypesAnswer, this.allProducts()).length,
        };
      }),
  );

  readonly currentStepIndex = computed<number>(() => Math.max(0, this.steps().indexOf(this.currentStep())));

  readonly stepViews = computed<WizardStepView[]>(() => {
    const idx = this.currentStepIndex();
    const finishAttempted = this.finishValidationAttempted();
    const attemptedSteps = this.validationAttemptedSteps();
    return this.steps().map((step, i) => {
      const flag = this.#stepMissing(step) && (finishAttempted || attemptedSteps.includes(step));
      return {
        hint: flag ? 'informationRequests.schedule.stepState.pending' : undefined,
        id: step,
        label: `informationRequests.schedule.steps.${step}`,
        state: i === idx ? (flag ? 'current-error' : 'current') : flag ? 'error' : 'done',
      };
    });
  });

  readonly modalProgress = computed<number>(() => {
    const total = this.steps().length;
    return total ? Math.round(((this.currentStepIndex() + 1) / total) * 100) : 0;
  });

  readonly stepDetails = computed(() => this.steps().map(step => ({ id: step, stateKey: this.#stepStateKey(step) })));
  readonly currentMissingFieldKeys = computed<string[]>(() => this.#stepMissingFieldKeys(this.currentStep()));
  readonly currentStepValidationAttempted = computed<boolean>(
    () => this.finishValidationAttempted() || this.validationAttemptedSteps().includes(this.currentStep()),
  );

  /** Effective products for the editing band: its own ticket-step products when set, else the global ones. */
  readonly editingBandProducts = computed<ProductRow[]>(() => {
    const band = this.editingBand();
    return band ? ticketProductsForNamedRange(band, this.allProducts()) : this.allProducts();
  });

  /** A band is complete enough to save once it has a name and at least one full date period. */
  readonly canFinish = computed<boolean>(() => {
    const band = this.editingBand();
    if (!band) return false;
    return this.#bandComplete(band) && !this.#stepMissing('tickets') && !this.#stepMissing('weekdays');
  });

  addBand(): void {
    if (this.bands().length > 0) {
      this.newRangeMode.set('scratch');
      this.newRangeCopySourceId.set('');
      this.newRangeChoiceOpen.set(true);
      return;
    }
    this.#openFreshBand();
  }

  confirmAddBand(): void {
    if (this.newRangeMode() === 'copy') {
      const source = (this.composer().namedDateRanges ?? []).find(b => b.id === this.newRangeCopySourceId());
      if (source) {
        const id = `nr-${this.composer().namedDateRanges?.length ?? 0}-${this.#suffix()}`;
        const next = this.#cloneBandFreshDates(source, id);
        this.editingBand.set(next);
        this.currentStep.set('identity');
        this.#resetValidation();
        this.newRangeChoiceOpen.set(false);
        return;
      }
    }
    this.newRangeChoiceOpen.set(false);
    this.#openFreshBand();
  }

  addFromScratch(): void {
    this.newRangeMode.set('scratch');
    this.confirmAddBand();
  }

  #openFreshBand(): void {
    const id = `nr-${this.composer().namedDateRanges?.length ?? 0}-${this.#suffix()}`;
    this.editingBand.set(defaultNamedDateRange(id));
    this.currentStep.set('identity');
    this.#resetValidation();
  }

  #persistBand(band: NamedDateRangeV1): void {
    const existing = this.composer().namedDateRanges ?? [];
    const idx = existing.findIndex(b => b.id === band.id);
    const next = idx >= 0 ? existing.map(b => (b.id === band.id ? band : b)) : [...existing, band];
    this.composerChange.emit({ ...this.composer(), namedDateRanges: next });
    this.#clearStoredStep(band.id);
    this.editingBand.set(null);
  }

  cancel(): void {
    this.editingBand.set(null);
  }

  editBand(id: string): void {
    const band = (this.composer().namedDateRanges ?? []).find(b => b.id === id);
    if (!band) return;
    this.editingBand.set(JSON.parse(JSON.stringify(band)) as NamedDateRangeV1);
    const storedStep = this.#readStoredStep(id);
    this.currentStep.set(storedStep ?? 'identity');
    this.#resetValidation();
  }

  finish(): void {
    const band = this.editingBand();
    if (!band || !this.canFinish()) {
      this.finishValidationAttempted.set(true);
      return;
    }
    this.#persistBand(band);
  }

  /** Persist the in-progress band as a draft (no completeness gate) and close the wizard so it can be resumed later. */
  saveProgress(): void {
    const band = this.editingBand();
    if (!band) return;
    this.#persistBand(band);
  }

  next(): void {
    this.#markStepValidationAttempted(this.currentStep());
    const i = this.currentStepIndex();
    const steps = this.steps();
    if (i < steps.length - 1) {
      this.currentStep.set(steps[i + 1]);
      this.#storeStep(steps[i + 1]);
    }
  }

  /** Jump directly to a step by its index (stepper card click). */
  goToStep(index: number): void {
    const steps = this.steps();
    if (index < 0 || index >= steps.length || index === this.currentStepIndex()) return;
    this.#markStepValidationAttempted(this.currentStep());
    this.currentStep.set(steps[index]);
    this.#storeStep(steps[index]);
  }

  onBandChange(band: NamedDateRangeV1): void {
    this.editingBand.set(band);
  }

  previous(): void {
    const i = this.currentStepIndex();
    const steps = this.steps();
    if (i > 0) {
      this.#markStepValidationAttempted(this.currentStep());
      this.currentStep.set(steps[i - 1]);
      this.#storeStep(steps[i - 1]);
    }
  }

  removeBand(id: string): void {
    const next = (this.composer().namedDateRanges ?? []).filter(b => b.id !== id);
    this.composerChange.emit({ ...this.composer(), namedDateRanges: next });
  }

  stepStatusClass(step: WizardStep): string {
    const current = this.currentStep();
    if (step === current) return 'ndr-editor__step-pill--current';
    const stepIndex = this.steps().indexOf(step);
    if (stepIndex < this.currentStepIndex()) return 'ndr-editor__step-pill--done';
    return '';
  }

  #bandComplete(band: NamedDateRangeV1): boolean {
    return namedRangeIdentityComplete(band);
  }

  #stepStateKey(step: WizardStep): string {
    const band = this.editingBand();
    if (!band) return 'informationRequests.schedule.stepState.pending';
    if (step === 'identity')
      return this.#bandComplete(band)
        ? 'informationRequests.schedule.stepState.complete'
        : 'informationRequests.schedule.stepState.required';
    if (step === 'tickets') {
      return this.#stepMissing('tickets')
        ? 'informationRequests.schedule.stepState.required'
        : 'informationRequests.schedule.stepState.complete';
    }
    return this.#stepMissing('weekdays')
      ? 'informationRequests.schedule.stepState.required'
      : 'informationRequests.schedule.stepState.complete';
  }

  #stepMissing(step: WizardStep): boolean {
    const band = this.editingBand();
    if (!band) return true;
    if (step === 'identity') return !this.#bandComplete(band);
    if (step === 'tickets') return this.#ticketsMissing(band);
    return this.#weekdaysMissing(band);
  }

  #ticketsMissing(band: NamedDateRangeV1): boolean {
    return !namedRangeTicketsComplete(band, this.allProducts());
  }

  #weekdaysMissing(band: NamedDateRangeV1): boolean {
    return !namedRangeWeekdaysComplete(band);
  }

  #stepMissingFieldKeys(step: WizardStep): string[] {
    const band = this.editingBand();
    if (!band) return ['informationRequests.schedule.validationFields.step'];
    if (step === 'identity') return this.#identityMissingFieldKeys(band);
    if (step === 'tickets') return this.#ticketsMissingFieldKeys(band);
    return this.#weekdaysMissingFieldKeys(band);
  }

  #identityMissingFieldKeys(band: NamedDateRangeV1): string[] {
    const missing = new Set<string>();
    if (!band.name?.trim()) missing.add('informationRequests.schedule.validationFields.periodName');
    const rows =
      Array.isArray(band.rangeSegments) && band.rangeSegments.length
        ? band.rangeSegments
        : [{ end: band.rangeEnd ?? '', start: band.rangeStart ?? '' }];
    const hasComplete = rows.some(row => String(row.start ?? '').trim() && String(row.end ?? '').trim());
    if (!hasComplete) missing.add('informationRequests.schedule.validationFields.datePeriod');
    if (rows.some(row => !!String(row.start ?? '').trim() !== !!String(row.end ?? '').trim())) {
      missing.add('informationRequests.schedule.validationFields.completeDatePeriod');
    }
    const spans = namedRangeInclusiveSpans(band);
    if (this.#hasInvalidExcludedRange(band, spans)) {
      missing.add('informationRequests.schedule.validationFields.excludedRange');
    }
    return [...missing];
  }

  /** True when any excluded row is partially filled, or a complete one falls outside the band's periods. */
  #hasInvalidExcludedRange(band: NamedDateRangeV1, spans: { start: string; end: string }[]): boolean {
    const rows = band.excludedRanges;
    if (Array.isArray(rows)) {
      return rows.some(row => {
        const start = String(row.start ?? '').trim();
        const end = String(row.end ?? '').trim();
        if (!!start !== !!end) return true;
        if (!start) return false;
        return !eachDayInclusiveYmd(start, end).every(date => spans.some(span => ymdInInclusiveSpan(date, span.start, span.end)));
      });
    }
    return (band.excludedDates ?? []).some(date => !spans.some(span => ymdInInclusiveSpan(date, span.start, span.end)));
  }

  #ticketsMissingFieldKeys(band: NamedDateRangeV1): string[] {
    if (this.allProducts().length === 0) {
      return ['informationRequests.schedule.validationFields.products'];
    }
    return parseSelectedProductIds(band.bandTicketTypesAnswer, this.allProducts()).length === 0
      ? ['informationRequests.schedule.validationFields.selectProducts']
      : [];
  }

  #weekdaysMissingFieldKeys(band: NamedDateRangeV1): string[] {
    const missing = new Set<string>();
    if (!Number.isFinite(band.durationMin) || (band.durationMin ?? 0) <= 0) {
      missing.add('informationRequests.schedule.validationFields.duration');
    }
    const openDows = [1, 2, 3, 4, 5, 6, 0].filter(dow => namedRangeWeekdayOpen(band, dow));
    if (!openDows.length) {
      missing.add('informationRequests.schedule.validationFields.sellingWeekdays');
      return [...missing];
    }
    for (const dow of openDows) {
      const slots = band.dowSlots?.[String(dow)] ?? [];
      if (!slots.length || slots.some(s => !/^\d{2}:\d{2}$/.test(String(s.start ?? '')))) {
        missing.add('informationRequests.schedule.validationFields.daySlots');
      }
      if (slots.some(s => s.productIds.length === 0)) {
        missing.add('informationRequests.schedule.validationFields.slotProducts');
      }
    }
    return [...missing];
  }

  #cloneBandFreshDates(source: NamedDateRangeV1, id: string): NamedDateRangeV1 {
    return {
      ...defaultNamedDateRange(id),
      bandTicketTypesAnswer: source.bandTicketTypesAnswer,
      durationMin: source.durationMin,
      dowSlots: JSON.parse(JSON.stringify(source.dowSlots ?? {})) as NamedDateRangeV1['dowSlots'],
      name: '',
      onlyDows: [...(source.onlyDows ?? [])],
    };
  }

  #storageKey(id: string): string {
    return `fz.ir.scheduleWizard.${id}`;
  }

  #readStoredStep(id: string): WizardStep | null {
    try {
      const value = localStorage.getItem(this.#storageKey(id)) as WizardStep | null;
      return value && this.steps().includes(value) ? value : null;
    } catch {
      return null;
    }
  }

  #storeStep(step: WizardStep): void {
    const band = this.editingBand();
    if (!band) return;
    try {
      localStorage.setItem(this.#storageKey(band.id), step);
    } catch {
      // Ignore storage availability; the wizard still works without resume.
    }
  }

  #clearStoredStep(id: string): void {
    try {
      localStorage.removeItem(this.#storageKey(id));
    } catch {
      // Ignore storage availability.
    }
  }

  #markStepValidationAttempted(step: WizardStep): void {
    this.validationAttemptedSteps.update(steps => (steps.includes(step) ? steps : [...steps, step]));
  }

  #resetValidation(): void {
    this.finishValidationAttempted.set(false);
    this.validationAttemptedSteps.set([]);
  }

  #suffix(): string {
    const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
    return c?.randomUUID ? c.randomUUID().slice(0, 8) : String(this.bands().length + 1);
  }
}
