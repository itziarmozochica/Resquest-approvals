import { FormGroup } from '@angular/forms';

export function setControlEditability(form: FormGroup, controlName: string, isEditable: boolean): void {
  const control = form.get(controlName);
  if (!control) {
    return;
  }

  if (isEditable && control.disabled) {
    control.enable({ emitEvent: false });
    return;
  }

  if (!isEditable && control.enabled) {
    control.disable({ emitEvent: false });
  }
}

export function applyControlsEditability(form: FormGroup, editabilityByControl: Record<string, boolean>): void {
  for (const [controlName, isEditable] of Object.entries(editabilityByControl)) {
    setControlEditability(form, controlName, isEditable);
  }
}
