import { FormArray, FormControl, FormGroup } from '@angular/forms';

import {
  isSheetBasedSubtype,
  isUrlBasedSubtype,
  PartnerReviewMode,
  SubtypePayloadValue,
  UrlListEntry,
} from './subtype-payload-editor.types';

export interface UrlEntryForm {
  description: FormControl<string>;
  mode: FormControl<PartnerReviewMode>;
  url: FormControl<string>;
}

export interface SheetPayloadForm {
  clientCommentsColIndex: FormControl<number>;
  colCount: FormControl<number>;
  hiddenColumns: FormControl<number[]>;
  rowCount: FormControl<number>;
  sheetName: FormControl<string>;
  sheetPreviewRows: FormControl<string[][]>;
  sheetTabId: FormControl<number>;
  spreadsheetId: FormControl<string>;
  spreadsheetUrl: FormControl<string>;
}

export interface ApprovalSubtypePayloadForm {
  sheet: FormGroup<SheetPayloadForm>;
  urlEntries: FormArray<FormGroup<UrlEntryForm>>;
}

export interface UrlEntryFormValue {
  description: string;
  mode: PartnerReviewMode;
  url: string;
}

export interface SheetPayloadFormValue {
  clientCommentsColIndex: number;
  colCount: number;
  hiddenColumns: number[];
  rowCount: number;
  sheetName: string;
  sheetPreviewRows: string[][];
  sheetTabId: number;
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export interface ApprovalSubtypePayloadFormValue {
  sheet: SheetPayloadFormValue;
  urlEntries: UrlEntryFormValue[];
}

export type ApprovalSubtypePayloadFormGroup = FormGroup<ApprovalSubtypePayloadForm>;

export function buildSubtypePayloadForm(value: SubtypePayloadValue | null = null): ApprovalSubtypePayloadFormGroup {
  const form = new FormGroup<ApprovalSubtypePayloadForm>({
    sheet: new FormGroup<SheetPayloadForm>({
      clientCommentsColIndex: new FormControl(-1, { nonNullable: true }),
      colCount: new FormControl(0, { nonNullable: true }),
      hiddenColumns: new FormControl<number[]>([], { nonNullable: true }),
      rowCount: new FormControl(0, { nonNullable: true }),
      sheetName: new FormControl('', { nonNullable: true }),
      sheetPreviewRows: new FormControl<string[][]>([], { nonNullable: true }),
      sheetTabId: new FormControl(0, { nonNullable: true }),
      spreadsheetId: new FormControl('', { nonNullable: true }),
      spreadsheetUrl: new FormControl('', { nonNullable: true }),
    }),
    urlEntries: new FormArray<FormGroup<UrlEntryForm>>([]),
  });
  patchSubtypePayloadForm(form, value);
  form.markAsPristine();
  return form;
}

export function createUrlEntryGroup(entry: UrlListEntry): FormGroup<UrlEntryForm> {
  return new FormGroup<UrlEntryForm>({
    description: new FormControl(entry.description, { nonNullable: true }),
    mode: new FormControl(entry.mode, { nonNullable: true }),
    url: new FormControl(entry.url, { nonNullable: true }),
  });
}

export function resetSubtypePayloadForm(form: ApprovalSubtypePayloadFormGroup): void {
  replaceUrlEntries(form, []);
  form.controls.sheet.reset({
    clientCommentsColIndex: -1,
    colCount: 0,
    hiddenColumns: [],
    rowCount: 0,
    sheetName: '',
    sheetPreviewRows: [],
    sheetTabId: 0,
    spreadsheetId: '',
    spreadsheetUrl: '',
  });
  form.markAsPristine();
}

export function patchSubtypePayloadForm(form: ApprovalSubtypePayloadFormGroup, value: SubtypePayloadValue | null): void {
  const urls = value?.urls ?? [];
  const modes = value?.urlPartnerReviewModes ?? [];
  const descriptions = value?.urlDescriptions ?? [];
  replaceUrlEntries(
    form,
    urls.map((url, index) => ({
      description: descriptions[index] ?? '',
      mode: (modes[index] ?? 'approve') as PartnerReviewMode,
      url,
    })),
  );
  form.controls.sheet.reset({
    clientCommentsColIndex: value?.clientCommentsColIndex ?? -1,
    colCount: value?.colCount ?? value?.sheetPreview?.rows[0]?.length ?? 0,
    hiddenColumns: value?.hiddenColumns ?? [],
    rowCount: value?.rowCount ?? value?.sheetPreview?.rows.length ?? 0,
    sheetName: value?.sheetName ?? '',
    sheetPreviewRows: value?.sheetPreview?.rows ?? [],
    sheetTabId: value?.sheetTabId ?? 0,
    spreadsheetId: value?.spreadsheetId ?? '',
    spreadsheetUrl: value?.spreadsheetUrl ?? '',
  });
  form.markAsPristine();
}

export function subtypePayloadValueFromForm(subtype: string, value: ApprovalSubtypePayloadFormValue): SubtypePayloadValue {
  if (isUrlBasedSubtype(subtype)) {
    return {
      urlDescriptions: value.urlEntries.map(entry => entry.description.trim()),
      urlPartnerReviewModes: value.urlEntries.map(entry => entry.mode),
      urls: value.urlEntries.map(entry => entry.url),
    };
  }
  if (isSheetBasedSubtype(subtype)) {
    return {
      clientCommentsColIndex: value.sheet.clientCommentsColIndex,
      colCount: value.sheet.colCount,
      hiddenColumns: value.sheet.hiddenColumns,
      rowCount: value.sheet.rowCount,
      sheetName: value.sheet.sheetName,
      sheetPreview: { rows: value.sheet.sheetPreviewRows },
      sheetTabId: value.sheet.sheetTabId,
      spreadsheetId: value.sheet.spreadsheetId,
      spreadsheetUrl: value.sheet.spreadsheetUrl.trim(),
    };
  }
  return {};
}

function replaceUrlEntries(form: ApprovalSubtypePayloadFormGroup, entries: UrlListEntry[]): void {
  const array = form.controls.urlEntries;
  array.clear();
  entries.forEach(entry => array.push(createUrlEntryGroup(entry)));
}
