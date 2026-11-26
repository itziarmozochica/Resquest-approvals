import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PlanTermsAndConditionsDraftService {
  readonly #byPlanId = signal<Readonly<Record<number, string>>>({});

  readonly snapshots = this.#byPlanId.asReadonly();

  getHtml(planId: number): string {
    return this.#byPlanId()[planId] ?? '';
  }

  hasMeaningfulContent(planId: number): boolean {
    return this.#isMeaningfulHtml(this.getHtml(planId));
  }

  setHtml(planId: number, html: string): void {
    this.#byPlanId.update(prev => ({ ...prev, [planId]: html }));
  }

  #isMeaningfulHtml(html: string): boolean {
    const text = html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim();
    return text.length > 0;
  }
}
