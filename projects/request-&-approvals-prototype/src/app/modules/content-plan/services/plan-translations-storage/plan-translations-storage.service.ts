import { Injectable } from '@angular/core';

import { PlanTranslation } from '../../models/plan-translation.model';

@Injectable({
  providedIn: 'root',
})
export class PlanTranslationsStorageService {
  #getStorageKey(planId: number): string {
    return `plan_translations_${planId}`;
  }

  getTranslations(planId: number): PlanTranslation[] {
    const key = this.#getStorageKey(planId);
    const stored = sessionStorage.getItem(key);
    if (!stored) {
      return [];
    }
    try {
      const translations = JSON.parse(stored) as PlanTranslation[];
      return translations;
    } catch {
      return [];
    }
  }

  saveTranslations(planId: number, translations: PlanTranslation[]): void {
    const key = this.#getStorageKey(planId);
    sessionStorage.setItem(key, JSON.stringify(translations));
  }

  clearTranslations(planId: number): void {
    const key = this.#getStorageKey(planId);
    sessionStorage.removeItem(key);
  }
}
