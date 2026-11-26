import { FormControl, FormGroup } from '@angular/forms';

import { ApprovalItemReviewDecision } from '../services/approvals.service';

export interface ApprovalReviewItemForm {
  decision: FormControl<ApprovalItemReviewDecision | null>;
  feedback: FormControl<string>;
}

export type ApprovalReviewItemsForm = FormGroup<Record<string, FormGroup<ApprovalReviewItemForm>>>;

export interface ApprovalReviewForm {
  items: ApprovalReviewItemsForm;
}

export type ApprovalReviewFormGroup = FormGroup<ApprovalReviewForm>;

export interface ApprovalReviewItemSeed {
  decision: ApprovalItemReviewDecision | null;
  feedback: string;
  itemId: string;
}

export interface ApprovalReviewDirtyItem {
  decision: ApprovalItemReviewDecision;
  feedback: string;
  itemId: string;
}

export function buildApprovalReviewForm(seeds: ApprovalReviewItemSeed[]): ApprovalReviewFormGroup {
  const items: Record<string, FormGroup<ApprovalReviewItemForm>> = {};
  for (const seed of seeds) {
    items[seed.itemId] = buildApprovalReviewItemGroup(seed);
  }
  const form = new FormGroup<ApprovalReviewForm>({
    items: new FormGroup(items),
  });
  form.markAsPristine();
  return form;
}

export function buildApprovalReviewItemGroup(seed: ApprovalReviewItemSeed): FormGroup<ApprovalReviewItemForm> {
  const group = new FormGroup<ApprovalReviewItemForm>({
    decision: new FormControl<ApprovalItemReviewDecision | null>(seed.decision),
    feedback: new FormControl(seed.feedback, { nonNullable: true }),
  });
  group.markAsPristine();
  return group;
}

export function reconcileApprovalReviewForm(form: ApprovalReviewFormGroup, seeds: ApprovalReviewItemSeed[]): ApprovalReviewItemSeed[] {
  const appliedSeeds = seeds.filter(seed => approvalReviewItemGroup(form, seed.itemId)?.dirty !== true);
  for (const seed of appliedSeeds) {
    const group = approvalReviewItemGroup(form, seed.itemId);
    if (group === null) {
      form.controls.items.addControl(seed.itemId, buildApprovalReviewItemGroup(seed), { emitEvent: false });
      continue;
    }
    if (group.controls.decision.value !== seed.decision || group.controls.feedback.value !== seed.feedback) {
      group.reset({ decision: seed.decision, feedback: seed.feedback });
    }
  }
  return appliedSeeds;
}

export function approvalReviewItemGroup(form: ApprovalReviewFormGroup, itemId: string): FormGroup<ApprovalReviewItemForm> | null {
  return form.controls.items.controls[itemId] ?? null;
}

export function approvalReviewDecisionControl(
  form: ApprovalReviewFormGroup,
  itemId: string,
): FormControl<ApprovalItemReviewDecision | null> {
  return ensureApprovalReviewItemGroup(form, itemId).controls.decision;
}

export function approvalReviewFeedbackControl(form: ApprovalReviewFormGroup, itemId: string): FormControl<string> {
  return ensureApprovalReviewItemGroup(form, itemId).controls.feedback;
}

export function setApprovalReviewDecision(
  form: ApprovalReviewFormGroup,
  itemId: string,
  decision: ApprovalItemReviewDecision,
  feedback?: string,
): void {
  const group = ensureApprovalReviewItemGroup(form, itemId);
  group.controls.decision.setValue(decision);
  group.controls.decision.markAsDirty();
  if (feedback !== undefined) {
    group.controls.feedback.setValue(feedback);
    group.controls.feedback.markAsDirty();
  }
  group.markAsDirty();
  form.markAsDirty();
}

export function dirtyApprovalReviewItems(form: ApprovalReviewFormGroup): ApprovalReviewDirtyItem[] {
  return Object.entries(form.controls.items.controls).flatMap(([itemId, group]) => {
    const decision = group.controls.decision.value;
    if (!group.dirty || decision === null) {
      return [];
    }
    return [
      {
        decision,
        feedback: group.controls.feedback.value,
        itemId,
      },
    ];
  });
}

function ensureApprovalReviewItemGroup(form: ApprovalReviewFormGroup, itemId: string): FormGroup<ApprovalReviewItemForm> {
  const existing = approvalReviewItemGroup(form, itemId);
  if (existing) {
    return existing;
  }
  const created = buildApprovalReviewItemGroup({ decision: null, feedback: '', itemId });
  form.controls.items.addControl(itemId, created);
  return created;
}
