import { computed, DestroyRef, inject, Injectable, Signal, signal } from '@angular/core';

import { Subscription } from 'rxjs';

import {
  AiTranslationGeneration,
  AiTranslationRating,
  AiTranslationRequest,
  AiTranslationResult,
  AiTranslationTargetKey,
} from '../../models/ai-translation.model';
import { requestedAiTranslationTargetKeys } from '../../utils/ai-translation-fields.util';
import { PartnersAiTranslationAdapter } from './partners-ai-translation.adapter';

@Injectable()
export class AiPlanTranslationSession {
  static readonly sparkleIcon: [string, string] = ['fas', 'sparkles'];

  readonly #adapter = inject(PartnersAiTranslationAdapter);
  readonly #destroyRef = inject(DestroyRef);

  readonly #appliedFields = signal<ReadonlySet<AiTranslationTargetKey>>(new Set());
  readonly #generatingFields = signal<ReadonlySet<AiTranslationTargetKey>>(new Set());
  readonly #generations = signal<ReadonlyMap<AiTranslationTargetKey, AiTranslationGeneration>>(new Map());
  readonly #ratings = signal<ReadonlyMap<AiTranslationTargetKey, AiTranslationRating>>(new Map());

  readonly appliedFields: Signal<ReadonlySet<AiTranslationTargetKey>> = this.#appliedFields.asReadonly();
  readonly generatingFields: Signal<ReadonlySet<AiTranslationTargetKey>> = this.#generatingFields.asReadonly();
  readonly isAnyGenerating: Signal<boolean> = computed<boolean>(() => this.#generatingFields().size > 0);

  #inFlight: Subscription | null = null;

  constructor() {
    this.#destroyRef.onDestroy(() => {
      this.cancel();
    });
  }

  cancel(): void {
    this.#inFlight?.unsubscribe();
    this.#inFlight = null;
    this.#generatingFields.set(new Set());
  }

  generationFor(field: AiTranslationTargetKey): AiTranslationGeneration | null {
    return this.#generations().get(field) ?? null;
  }

  hasApplied(field: AiTranslationTargetKey): boolean {
    return this.#appliedFields().has(field);
  }

  isGenerating(field: AiTranslationTargetKey): boolean {
    return this.#generatingFields().has(field);
  }

  markApplied(keys: readonly AiTranslationTargetKey[], origin: Omit<AiTranslationGeneration, 'isRetranslate'>): void {
    const previouslyApplied = this.#appliedFields();
    this.#appliedFields.update((current: ReadonlySet<AiTranslationTargetKey>) => {
      const next = new Set(current);
      for (const key of keys) {
        next.add(key);
      }
      return next;
    });
    this.#generations.update((current: ReadonlyMap<AiTranslationTargetKey, AiTranslationGeneration>) => {
      const next = new Map(current);
      for (const key of keys) {
        next.set(key, { ...origin, isRetranslate: previouslyApplied.has(key) });
      }
      return next;
    });
    this.#ratings.update((current: ReadonlyMap<AiTranslationTargetKey, AiTranslationRating>) => {
      const next = new Map(current);
      for (const key of keys) {
        next.delete(key);
      }
      return next;
    });
  }

  rate(field: AiTranslationTargetKey, rating: AiTranslationRating): void {
    this.#ratings.update((current: ReadonlyMap<AiTranslationTargetKey, AiTranslationRating>) => new Map(current).set(field, rating));
  }

  ratingFor(field: AiTranslationTargetKey): AiTranslationRating | null {
    return this.#ratings().get(field) ?? null;
  }

  reset(): void {
    this.cancel();
    this.#appliedFields.set(new Set());
    this.#generations.set(new Map());
    this.#ratings.set(new Map());
  }

  start(request: AiTranslationRequest, onSuccess: (result: AiTranslationResult) => void, onError: () => void): void {
    const keys = requestedAiTranslationTargetKeys(request.fields, request.sessionTypes);
    this.cancel();
    this.#generatingFields.set(new Set(keys));

    this.#inFlight = this.#adapter.translate(request).subscribe({
      error: () => {
        this.#generatingFields.set(new Set());
        this.#inFlight = null;
        onError();
      },
      next: (result: AiTranslationResult) => {
        this.#generatingFields.set(new Set());
        this.#inFlight = null;
        onSuccess(result);
      },
    });
  }
}
