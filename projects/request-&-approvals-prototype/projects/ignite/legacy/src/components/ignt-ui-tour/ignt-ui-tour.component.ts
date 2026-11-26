import {
  ConnectedOverlayPositionChange,
  ConnectedPosition,
  FlexibleConnectedPositionStrategy,
  Overlay,
  OverlayRef,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgIf, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  input,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  Signal,
  signal,
  TemplateRef,
  viewChild,
  ViewContainerRef,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AlertSentiment } from '../ignt-alert/ignt-alert.component';
import { IgntButtonComponent } from '../ignt-button/ignt-button.component';
import { IgntWrapperCardComponent } from '../ignt-wrapper-card/ignt-wrapper-card.component';
import { IgntTourService } from './ignt-tour.service';
import { IgntTourConfig, IgntTourStep } from './ignt-ui-tour.model';

type IgntTourArrowPosition = 'bottom' | 'left' | 'right' | 'top';

@Component({
  selector: 'ignt-ui-tour',
  templateUrl: './ignt-ui-tour.component.html',
  styleUrls: ['./ignt-ui-tour.component.scss'],
  standalone: true,
  imports: [IgntButtonComponent, IgntWrapperCardComponent, TranslateModule, NgIf, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IgntTourComponent implements OnInit, OnDestroy {
  readonly #anchorGap = 10;
  readonly #arrowPositionByPlacement: Record<IgntTourStep['position'], IgntTourArrowPosition> = {
    bottom: 'top',
    left: 'right',
    right: 'left',
    top: 'bottom',
  };
  readonly #placementPreferences: Record<IgntTourStep['position'], readonly IgntTourStep['position'][]> = {
    bottom: ['bottom', 'top', 'right', 'left'],
    left: ['left', 'right', 'bottom', 'top'],
    right: ['right', 'left', 'bottom', 'top'],
    top: ['top', 'bottom', 'right', 'left'],
  };
  readonly #viewportMargin = 10;

  readonly #BASE_CLASS = 'tour';
  #cardPortal: TemplatePortal | null = null;
  #changeDetector = inject(ChangeDetectorRef);
  #datadogLogService = inject(DatadogLogService);
  readonly #destroyRef = inject(DestroyRef);
  #element = inject(ElementRef);
  #firstValidStepIndex: WritableSignal<number | null> = signal<number | null>(null);
  #lastValidStepIndex: WritableSignal<number | null> = signal<number | null>(null);
  readonly #overlay = inject(Overlay);
  #overlayRef: OverlayRef | null = null;
  #renderer = inject(Renderer2);
  #toastService = inject(ToastService);
  #tourService = inject(IgntTourService);
  #translateService = inject(TranslateService);

  get canNavigatePrev(): boolean {
    if (!this.config?.continueOnError) {
      return !this.isFirstStep;
    }

    const firstValid = this.#firstValidStepIndex();
    if (firstValid === null) {
      return !this.isFirstStep;
    }

    return this.currentStepIndex() > firstValid;
  }

  get isFirstStep(): boolean {
    return this.currentStepIndex() === 0;
  }
  get isLastStep(): boolean {
    const lastStepIndex = this.config.steps.length - 1;
    return this.currentStepIndex() === lastStepIndex;
  }

  protected readonly arrowPosition = signal<IgntTourArrowPosition>('top');
  protected readonly cardHost: Signal<ViewContainerRef> = viewChild.required('cardHost', { read: ViewContainerRef });
  protected readonly cardTemplate: Signal<TemplateRef<unknown>> = viewChild.required<TemplateRef<unknown>>('cardTemplate');
  @Input() config!: IgntTourConfig;
  currentStep: WritableSignal<IgntTourStep | null> = signal<IgntTourStep | null>(null);
  currentStepIndex: WritableSignal<number> = signal<number>(0);
  hasStarted: WritableSignal<boolean> = signal<boolean>(false);
  isLoading: WritableSignal<boolean> = signal<boolean>(true);
  readonly isOpen = input<boolean>(false);
  @Input() showPreviousStepButton = true;
  @Input() showSuccessModal = true;
  @Output() stepChange = new EventEmitter<number>();
  @Output() tourClose = new EventEmitter<void>();
  @Output() tourComplete = new EventEmitter<void>();

  constructor() {
    effect(() => {
      const isOpen = this.isOpen();
      const hasStarted = this.hasStarted();
      const currentStep = this.currentStep();

      if (!isOpen) {
        this.#detachStepCard();
        return;
      }

      if (!hasStarted || !currentStep) {
        return;
      }

      if (this.#overlayRef?.hasAttached()) {
        return;
      }

      this.#alignStepInfoToCurrentStepAnchor('start');
    });
  }

  closeTour() {
    this.#datadogLogService.logInfo('[IgntTour] Tour closed', {
      tourKey: this.config.tourStorageKey,
      currentStep: this.currentStepIndex(),
      totalSteps: this.config.steps.length,
    });
    this.tourClose.emit();
    this.hasStarted.set(false);
    this.#firstValidStepIndex.set(null);
    this.#lastValidStepIndex.set(null);
    this.#detachStepCard();
    this.#tourService.reset();
  }

  goTo(to: 'prev' | 'next' | 'start', event?: Event) {
    if (this.isLastStep && to === 'next') {
      this.#completeTour(true);
      return;
    }

    if (this.config?.continueOnError) {
      if (to === 'prev' && !this.canNavigatePrev) {
        return;
      }
    }

    this.isLoading.set(true);

    if (to === 'next') {
      this.#tourService.next();
    } else if (to === 'prev') {
      this.#tourService.prev();
    }

    this.#updateCurrentStep();
    this.#changeDetector.detectChanges();

    this.#alignStepInfoToCurrentStepAnchor(to);
    this.isLoading.set(false);

    if (event?.target) {
      (event.target as HTMLElement).blur();
    }
  }

  ngOnDestroy() {
    this.#cleanup();
  }

  ngOnInit() {
    this.#renderer.addClass(this.#element.nativeElement, this.#BASE_CLASS);
    if (this.config?.steps) {
      this.#tourService.setSteps(this.config.steps);
    }
  }

  startTour() {
    this.#datadogLogService.logInfo('[IgntTour] Tour started', {
      tourKey: this.config.tourStorageKey,
      totalSteps: this.config.steps.length,
    });
    this.hasStarted.set(true);
    this.#firstValidStepIndex.set(null);
    this.#lastValidStepIndex.set(null);
    this.goTo('start');
  }

  #alignStepInfoTo(anchor: ElementRef | null, to: 'prev' | 'next' | 'start') {
    if (!anchor) {
      this.#handleMissingOrInvalidAnchor(to);
      return;
    }

    const rect = anchor.nativeElement.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      this.#handleMissingOrInvalidAnchor(to);
      return;
    }

    const currentStep = this.currentStep();
    if (!currentStep) {
      return;
    }

    this.#setArrowPosition(currentStep.position);
    this.#showStepCard(anchor, currentStep);
    this.#trackValidStepBoundaries();
  }

  #alignStepInfoToCurrentStepAnchor(to: 'prev' | 'next' | 'start') {
    const anchor = this.#tourService.getAnchorForStepIndex(this.currentStepIndex());
    this.#alignStepInfoTo(anchor, to);
  }

  #buildConnectedPosition(placement: IgntTourStep['position']): ConnectedPosition {
    const gap: number = this.#anchorGap;

    switch (placement) {
      case 'top':
        return { offsetY: -gap, originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' };
      case 'left':
        return { offsetX: -gap, originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' };
      case 'right':
        return { offsetX: gap, originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' };
      default:
        return { offsetY: gap, originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' };
    }
  }

  #buildPositionStrategy(anchor: ElementRef, placement: IgntTourStep['position']): FlexibleConnectedPositionStrategy {
    const placements: readonly IgntTourStep['position'][] = this.#placementPreferences[placement] ?? this.#placementPreferences.bottom;

    return this.#overlay
      .position()
      .flexibleConnectedTo(anchor.nativeElement)
      .withPositions(placements.map((candidate: IgntTourStep['position']): ConnectedPosition => this.#buildConnectedPosition(candidate)))
      .withFlexibleDimensions(false)
      .withPush(true)
      .withViewportMargin(this.#viewportMargin);
  }

  #cleanup() {
    this.#overlayRef?.dispose();
    this.#overlayRef = null;
    this.#cardPortal = null;
  }

  #completeTour(isSuccessful: boolean) {
    if (isSuccessful) {
      this.#datadogLogService.logInfo('[IgntTour] Tour completed successfully', {
        tourKey: this.config.tourStorageKey,
        totalSteps: this.config.steps.length,
      });

      if (this.showSuccessModal) {
        this.#toastService.add({
          message: this.#translateService.instant('uiTour.successMessage'),
          sentiment: AlertSentiment.positive,
          autoHide: true,
        });
      }
    } else {
      this.#datadogLogService.logError('[IgntTour] Tour ended by error', {
        tourKey: this.config.tourStorageKey,
        currentStep: this.currentStepIndex(),
        currentStepTitle: this.currentStep()?.title,
      });
      this.#toastService.add({
        message: this.#translateService.instant('uiTour.errorMessage'),
        sentiment: AlertSentiment.danger,
        autoHide: true,
      });
    }
    this.#tourService.markTourAsCompleted(this.config.tourStorageKey);
    this.tourComplete.emit();
    this.closeTour();
  }

  #detachStepCard(): void {
    this.#overlayRef?.detach();
  }

  #getCardPortal(): TemplatePortal {
    this.#cardPortal ??= new TemplatePortal(this.cardTemplate(), this.cardHost());
    return this.#cardPortal;
  }

  #getOverlayRef(): OverlayRef {
    if (this.#overlayRef) {
      return this.#overlayRef;
    }

    const overlayRef: OverlayRef = this.#overlay.create({
      scrollStrategy: this.#overlay.scrollStrategies.reposition(),
    });
    // CDK pane defaults to max-width: 100% of the connected box, which shrinks the tour card near viewport edges.
    this.#renderer.setStyle(overlayRef.overlayElement, 'max-width', 'none');
    this.#overlayRef = overlayRef;
    return overlayRef;
  }

  #handleMissingOrInvalidAnchor(to: 'prev' | 'next' | 'start'): void {
    if (this.config.continueOnError) {
      this.#skipFailingStep(to);
      return;
    }

    this.#completeTour(false);
  }

  #placementFromConnectedPosition(position: ConnectedPosition): IgntTourStep['position'] {
    const placements: readonly IgntTourStep['position'][] = ['bottom', 'left', 'right', 'top'];

    return (
      placements.find((candidate: IgntTourStep['position']): boolean => {
        const candidatePosition: ConnectedPosition = this.#buildConnectedPosition(candidate);
        return (
          candidatePosition.originX === position.originX &&
          candidatePosition.originY === position.originY &&
          candidatePosition.overlayX === position.overlayX &&
          candidatePosition.overlayY === position.overlayY
        );
      }) ?? 'bottom'
    );
  }

  #setArrowPosition(placement: IgntTourStep['position']): void {
    this.arrowPosition.set(this.#arrowPositionByPlacement[placement] ?? 'top');
  }

  #showStepCard(anchor: ElementRef, step: IgntTourStep): void {
    if (!this.isOpen()) {
      return;
    }

    const overlayRef: OverlayRef = this.#getOverlayRef();

    const positionStrategy: FlexibleConnectedPositionStrategy = this.#buildPositionStrategy(anchor, step.position);
    overlayRef.updatePositionStrategy(positionStrategy);
    positionStrategy.positionChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((change: ConnectedOverlayPositionChange): void => {
        this.#setArrowPosition(this.#placementFromConnectedPosition(change.connectionPair));
      });

    this.isLoading.set(false);

    if (!overlayRef.hasAttached()) {
      overlayRef.attach(this.#getCardPortal());
      return;
    }

    overlayRef.updatePosition();
  }

  #skipFailingStep(to: 'prev' | 'next' | 'start'): void {
    this.#datadogLogService.logWarn('[IgntTour] Step anchor not found or invalid', {
      tourKey: this.config.tourStorageKey,
      currentStep: this.currentStepIndex(),
      currentStepTitle: this.currentStep()?.title,
      to: to,
    });

    this.#toastService.add({
      message: this.#translateService.instant('uiTour.errorMessageForSkippedFailingStep'),
      sentiment: AlertSentiment.warning,
      autoHide: true,
    });
    this.#skipCurrentAndNavigateToValidStep(to);
  }

  #skipCurrentAndNavigateToValidStep(to: 'prev' | 'next' | 'start'): void {
    const resolvedDirection: 'next' | 'prev' = to === 'start' ? 'next' : to;

    if (resolvedDirection === 'next' && this.isLastStep) {
      this.#completeTour(true);
      return;
    }

    if (resolvedDirection === 'prev' && this.isFirstStep) {
      return;
    }

    if (resolvedDirection === 'next') {
      this.#tourService.next();
    } else {
      this.#tourService.prev();
    }

    this.#updateCurrentStep();
    this.#changeDetector.detectChanges();
    this.#alignStepInfoToCurrentStepAnchor(to);
  }

  #trackValidStepBoundaries(): void {
    const currentIndex = this.currentStepIndex();
    const firstValid = this.#firstValidStepIndex();
    const lastValid = this.#lastValidStepIndex();

    if (firstValid === null || currentIndex < firstValid) {
      this.#firstValidStepIndex.set(currentIndex);
    }
    if (lastValid === null || currentIndex > lastValid) {
      this.#lastValidStepIndex.set(currentIndex);
    }
  }

  #updateCurrentStep() {
    this.currentStep.set(this.#tourService.getCurrentStep());
    this.currentStepIndex.set(this.#tourService.getCurrentStepIndex());
    this.stepChange.emit(this.currentStep() ? this.currentStepIndex() : 0);
  }
}
