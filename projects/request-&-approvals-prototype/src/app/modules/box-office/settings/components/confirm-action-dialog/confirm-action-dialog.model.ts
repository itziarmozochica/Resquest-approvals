import { IgntIconName } from '@ignite/icon';

export type ConfirmActionKind = 'cancel' | 'duplicate' | 'remove';

export const CONFIRM_ACTION_ICONS: Record<ConfirmActionKind, IgntIconName> = {
  cancel: 'times-circle',
  duplicate: 'copy',
  remove: 'triangle-exclamation',
};

export interface ConfirmActionDialogData {
  actionLabel: string;
  description: string;
  dismissLabel: string;
  kind: ConfirmActionKind;
  question: string;
}
