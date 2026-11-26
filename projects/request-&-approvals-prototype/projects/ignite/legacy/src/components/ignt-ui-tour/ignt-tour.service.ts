import { ElementRef, inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { IgntTourStep } from './ignt-ui-tour.model';

@Injectable({ providedIn: 'root' })
export class IgntTourService {
  #anchors = new Map<string, ElementRef<HTMLElement>>();
  #currentStepIndex$ = new BehaviorSubject<number>(0);
  #steps: IgntTourStep[] = [];
  #translateService = inject(TranslateService);

  createTourStep(translationsPath: string, stepIdentifier: string, position: 'top' | 'bottom' | 'left' | 'right' = 'bottom'): IgntTourStep {
    return {
      stepIdentifier: stepIdentifier,
      title: this.#translateService.instant(`${translationsPath}.${stepIdentifier}.title`),
      content: this.#translateService.instant(`${translationsPath}.${stepIdentifier}.content`),
      position,
    };
  }

  getAnchorForStepIndex(stepIndex: number): ElementRef<HTMLElement> | null {
    const step = this.#steps[stepIndex];
    if (!step) {
      return null;
    }
    const anchorId = step.stepIdentifier;
    return this.#anchors.get(anchorId) || null;
  }

  getCurrentStep(): IgntTourStep | null {
    return this.#steps[this.#currentStepIndex$.value] || null;
  }

  getCurrentStepIndex(): number {
    return this.#currentStepIndex$.value;
  }

  isTourCompleted(tourStorageKey: string): boolean {
    return localStorage.getItem(tourStorageKey) === 'true';
  }

  markTourAsCompleted(tourStorageKey: string): void {
    localStorage.setItem(tourStorageKey, 'true');
  }

  resetTourCompletion(tourStorageKey: string): void {
    localStorage.removeItem(tourStorageKey);
  }

  next() {
    if (this.#currentStepIndex$.value < this.#steps.length - 1) {
      this.#currentStepIndex$.next(this.#currentStepIndex$.value + 1);
    }
  }

  prev() {
    if (this.#currentStepIndex$.value > 0) {
      this.#currentStepIndex$.next(this.#currentStepIndex$.value - 1);
    }
  }

  registerAnchor(anchorId: string, el: ElementRef<HTMLElement>) {
    this.#anchors.set(anchorId, el);
  }

  reset() {
    this.#currentStepIndex$.next(0);
  }

  setSteps(steps: IgntTourStep[]) {
    this.#steps = steps;
  }

  unregisterAnchor(anchorId: string) {
    this.#anchors.delete(anchorId);
  }
}
