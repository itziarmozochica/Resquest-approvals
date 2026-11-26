import { HttpErrorResponse } from '@angular/common/http';

import { toEditableModuleKey } from './immersive-layout-general-settings.util';
import type { LayoutPersistIntent } from './immersive-layout-persist-gate.util';
import type { PublishValidationError } from './immersive-layout-publish-validation.util';

// One POST backs three products, so the message has to name the one the user asked for: a revert
// that reports "publishing failed" describes an action they did not take.
const TRANSPORT_FAILURE_MESSAGES: Record<LayoutPersistIntent, string> = {
  publish: 'Publishing failed. Please try again.',
  'revert-to-draft': 'Moving the layout back to draft failed. Please try again.',
  'save-draft': 'Saving the draft failed. Please try again.',
};

const REJECTION_MESSAGES: Record<LayoutPersistIntent, string> = {
  publish: 'The layout could not be published.',
  'revert-to-draft': 'The layout could not be moved back to draft.',
  'save-draft': 'The draft could not be saved.',
};

// `schema.channel_overrides.<channelId>.<moduleId>[.props.<fieldPath>]`: the backend names a variant by
// path, the editor by editable key.
const CHANNEL_OVERRIDE_PATH = /^schema\.channel_overrides\.([^.]+)\.([^.]+)(?:\.props\.(.+))?$/;

export function mapPublishHttpError(error: unknown, intent: LayoutPersistIntent): PublishValidationError[] {
  if (!(error instanceof HttpErrorResponse) || error.status !== 422) {
    return [
      {
        code: 'request_failed',
        message: TRANSPORT_FAILURE_MESSAGES[intent],
      },
    ];
  }

  const detail = error.error?.detail;
  if (Array.isArray(detail)) {
    return detail.map((entry: { loc?: unknown[]; msg?: string }) => ({
      code: 'invalid_enum',
      message: entry.msg ?? 'Invalid request.',
    }));
  }

  if (detail !== null && typeof detail === 'object' && Array.isArray(detail.errors)) {
    return detail.errors.flatMap((entry: { locale?: string; key?: string; message?: string; path?: string }) => {
      if (entry.locale !== undefined && entry.key !== undefined) {
        return [
          {
            code: 'missing_translation',
            locale: entry.locale,
            message: entry.message ?? `Missing translation for "${entry.key}" in ${entry.locale}.`,
            token: entry.key,
          },
        ];
      }
      if (entry.path !== undefined) {
        const [, channelId, moduleId, fieldPath] = CHANNEL_OVERRIDE_PATH.exec(entry.path) ?? [];
        return [
          {
            code: 'invalid_enum',
            fieldPath: channelId === undefined ? entry.path : fieldPath,
            message: entry.message ?? `Invalid value at ${entry.path}.`,
            ...(channelId === undefined ? {} : { moduleId: toEditableModuleKey(moduleId, channelId) }),
          },
        ];
      }
      return [
        {
          code: 'invalid_enum',
          message: entry.message ?? 'Invalid document.',
        },
      ];
    });
  }

  return [
    {
      code: 'server_rejected',
      message: REJECTION_MESSAGES[intent],
    },
  ];
}
