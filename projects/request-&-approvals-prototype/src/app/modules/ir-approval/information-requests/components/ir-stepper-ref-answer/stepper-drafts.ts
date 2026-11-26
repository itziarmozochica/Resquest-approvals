export interface StepperDraft {
  v: 1;
  currentStep: number;
  answers: Record<string, unknown>;
}

export function stepperDraftKey(irId: string, templateKey: string, instanceId: string): string {
  return `fz.stepperWizard.${irId}.${templateKey}.${instanceId}`;
}

export function readStepperDraft(key: string, storage: Storage = window.localStorage): StepperDraft | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === 1 && typeof parsed.currentStep === 'number' && parsed.answers && typeof parsed.answers === 'object') {
      return parsed as StepperDraft;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStepperDraft(key: string, draft: StepperDraft, storage: Storage = window.localStorage): void {
  try {
    storage.setItem(key, JSON.stringify(draft));
  } catch {
    /* quota or privacy mode — silent best-effort */
  }
}

export function clearStepperDraft(key: string, storage: Storage = window.localStorage): void {
  try {
    storage.removeItem(key);
  } catch {
    /* silent */
  }
}
