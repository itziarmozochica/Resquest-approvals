import { AbstractControl, ValidationErrors } from '@angular/forms';

import { PLAN_METADATA_API_FIELDS, PlanMetadata, PlanMetadataApiField } from '../../../models/plan-metadata.model';
import { toNullableInteger } from '../../../utils/nullable-integer.util';
import { PlanMetadataControlName, PlanMetadataRejection } from './plan-metadata-edition.model';

const CONTROL_BY_API_FIELD: Record<PlanMetadataApiField, PlanMetadataControlName> = {
  composer_id: 'composerId',
  composer_name: 'composerName',
  ensemble: 'ensemble',
  instrumentation: 'instrumentation',
  music_genre: 'musicGenre',
  program_id: 'programId',
  setlist: 'setlist',
};

const FIELD_SEPARATOR = ' @ ';

const VALUE_ERROR_PREFIX = 'Value error, ';

export function integerValidator(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return toNullableInteger(value) === null ? { notAnInteger: true } : null;
  }
  return { notAnInteger: true };
}

export function isSamePlanMetadata(left: PlanMetadata, right: PlanMetadata): boolean {
  return (
    left.composerId === right.composerId &&
    left.composerName === right.composerName &&
    left.ensemble === right.ensemble &&
    left.instrumentation === right.instrumentation &&
    left.musicGenre === right.musicGenre &&
    left.programId === right.programId &&
    left.setlist === right.setlist
  );
}

export function parsePlanMetadataRejection(message: string | null | undefined): PlanMetadataRejection {
  const fieldErrors: Partial<Record<PlanMetadataControlName, string>> = {};
  const unmappedErrors: string[] = [];

  const lines = (message ?? '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  for (const line of lines) {
    const separatorIndex = line.lastIndexOf(FIELD_SEPARATOR);
    if (separatorIndex === -1) {
      unmappedErrors.push(line);
      continue;
    }

    const text = stripValueErrorPrefix(line.slice(0, separatorIndex).trim());
    const controlName = resolveControlName(line.slice(separatorIndex + FIELD_SEPARATOR.length)) ?? resolveControlNameFromText(text);

    if (controlName === null || text.length === 0) {
      unmappedErrors.push(line);
      continue;
    }

    const existing = fieldErrors[controlName];
    fieldErrors[controlName] = existing === undefined ? text : `${existing}\n${text}`;
  }

  return { fieldErrors, unmappedErrors };
}

export function readRejectionMessage(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const envelopeMessage = 'error' in body ? readMessage(body.error) : null;
  return envelopeMessage ?? readMessage(body);
}

function readMessage(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('message' in value)) {
    return null;
  }
  return typeof value.message === 'string' ? value.message : null;
}

function resolveControlName(fieldPath: string): PlanMetadataControlName | null {
  return toControlName(fieldPath.trim().split('.').at(-1)?.trim() ?? '');
}

function resolveControlNameFromText(text: string): PlanMetadataControlName | null {
  return toControlName(text.split(/\s+/)[0] ?? '');
}

function stripValueErrorPrefix(text: string): string {
  return text.startsWith(VALUE_ERROR_PREFIX) ? text.slice(VALUE_ERROR_PREFIX.length).trim() : text;
}

function toControlName(candidate: string): PlanMetadataControlName | null {
  const apiField = PLAN_METADATA_API_FIELDS.find(field => field === candidate);
  return apiField === undefined ? null : CONTROL_BY_API_FIELD[apiField];
}
