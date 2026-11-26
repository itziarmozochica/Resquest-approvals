import { computed, Injectable, signal } from '@angular/core';

import { FzTrackedUpload } from '@fz-original/app/modules/ir-approval/shared/models/fz-upload.model';

import { DriveLinkImport, IrLeftOutDriveFiles, IrLeftOutReason } from '../models/drive-link-import.model';
import { fileAnswerKey, InformationRequestFileAnswer } from '../models/information-request-question.model';

interface FollowedImport {
  latest: DriveLinkImport | null;
  questionId: string;
}

const NO_TRACKED_UPLOADS: readonly FzTrackedUpload[] = [];

@Injectable()
export class IrFileSyncTrackerService {
  readonly #awaitedQuestionByImportJobId = new Map<string, string>();
  readonly #importJobIdsFinishedAtLoad = new Set<string>();
  readonly #driveLinkImportJobIds = signal<ReadonlySet<string>>(new Set());
  readonly #followedImports = signal<ReadonlyMap<string, FollowedImport>>(new Map());
  readonly #dismissedSourceJobIds = signal<ReadonlySet<string>>(new Set());
  readonly #stalledQuestionIds = signal<ReadonlySet<string>>(new Set());
  readonly #stalledFileKeys = signal<ReadonlySet<string>>(new Set());
  readonly #dismissedNotices = signal<ReadonlyMap<string, ReadonlySet<string>>>(new Map());
  readonly #pendingDeletionNames = signal<ReadonlyMap<string, ReadonlySet<string>>>(new Map());
  readonly #markedForDeletionBySourceJobId = signal<ReadonlyMap<string, ReadonlySet<string>>>(new Map());

  readonly #trackedUploadsByQuestion = computed(() =>
    [...this.#followedImports()]
      .filter(([sourceJobId]) => !this.#dismissedSourceJobIds().has(sourceJobId))
      .reduce<Readonly<Record<string, readonly FzTrackedUpload[]>>>(
        (byQuestion, [sourceJobId, { latest, questionId }]) => ({
          ...byQuestion,
          [questionId]: [
            ...(byQuestion[questionId] ?? []),
            toTrackedUpload(sourceJobId, latest, this.#markedForDeletion(sourceJobId, questionId)),
          ],
        }),
        {},
      ),
  );

  readonly #leftOutImportsByQuestion = computed(() =>
    [...latestImportPerLink(this.#followedImports()).values()]
      .filter(
        ({ latest }) =>
          latest.sourceStatus === 'COMPLETED' && hasFilesLeftOut(latest) && !this.#dismissedSourceJobIds().has(latest.sourceJobId),
      )
      .reduce<
        Readonly<Record<string, readonly DriveLinkImport[]>>
      >((byQuestion, { latest, questionId }) => ({ ...byQuestion, [questionId]: [...(byQuestion[questionId] ?? []), latest] }), {}),
  );

  accepts(answer: InformationRequestFileAnswer): boolean {
    return (
      !!answer.importJobId &&
      (this.#awaitedQuestionByImportJobId.has(answer.importJobId) || this.#importJobIdsFinishedAtLoad.has(answer.importJobId))
    );
  }

  acknowledge(added: readonly InformationRequestFileAnswer[]): void {
    for (const answer of added) {
      if (answer.importJobId) {
        this.#awaitedQuestionByImportJobId.delete(answer.importJobId);
        this.#importJobIdsFinishedAtLoad.delete(answer.importJobId);
      }
    }
  }

  applyImports(imports: readonly DriveLinkImport[], isKnownImportJob: (questionId: string, importJobId: string) => boolean): boolean {
    this.#rememberDriveLinkImportJobs(imports);
    const followed = new Map(this.#followedImports());
    const markedForDeletion = new Map(this.#markedForDeletionBySourceJobId());
    let moved = false;
    for (const latest of imports) {
      const current = followed.get(latest.sourceJobId);
      if (!current && !isImportInProgress(latest)) {
        continue;
      }
      if (current?.latest && isSameImport(current.latest, latest)) {
        continue;
      }
      followed.set(latest.sourceJobId, { latest, questionId: latest.questionId });
      if (latest.sourceStatus === 'COMPLETED' && current?.latest?.sourceStatus !== 'COMPLETED') {
        const pendingDeletions = this.#pendingDeletions(latest.questionId);
        markedForDeletion.set(latest.sourceJobId, new Set(latest.alreadyImportedFiles.filter(name => pendingDeletions.has(name))));
      }
      this.#releaseStalledQuestion(latest.questionId);
      for (const importJobId of latest.importJobIds) {
        if (!isKnownImportJob(latest.questionId, importJobId)) {
          this.#awaitedQuestionByImportJobId.set(importJobId, latest.questionId);
        }
      }
      moved = true;
    }
    if (moved) {
      this.#followedImports.set(followed);
      this.#markedForDeletionBySourceJobId.set(markedForDeletion);
    }
    return moved;
  }

  applyInitialImports(imports: readonly DriveLinkImport[], isKnownImportJob: (questionId: string, importJobId: string) => boolean): void {
    this.applyImports(imports, isKnownImportJob);
    for (const latest of imports) {
      if (latest.sourceStatus !== 'COMPLETED' || this.#followedImports().has(latest.sourceJobId)) {
        continue;
      }
      latest.importJobIds
        .filter(importJobId => !isKnownImportJob(latest.questionId, importJobId))
        .forEach(importJobId => this.#importJobIdsFinishedAtLoad.add(importJobId));
    }
  }

  dismissNotice(questionId: string, reason: IrLeftOutReason): void {
    const key = noticeKey(questionId, reason);
    const dismissed = new Set([...(this.#dismissedNotices().get(key) ?? []), ...this.#noticeSourceJobIds(questionId, reason)]);
    this.#dismissedNotices.set(new Map(this.#dismissedNotices()).set(key, dismissed));
  }

  dismissTrackedUpload(sourceJobId: string): void {
    this.#dismissedSourceJobIds.set(new Set([...this.#dismissedSourceJobIds(), sourceJobId]));
  }

  hasActiveWork(): boolean {
    return this.hasAwaitedFiles() || this.hasImportsInProgress();
  }

  hasAwaitedFiles(): boolean {
    return this.#awaitedQuestionByImportJobId.size > 0 || this.#importJobIdsFinishedAtLoad.size > 0;
  }

  hasImportsInProgress(): boolean {
    return [...this.#followedImports().values()].some(({ latest }) => latest === null || isImportInProgress(latest));
  }

  importJobIdsFinishedAtLoad(): ReadonlySet<string> {
    return new Set(this.#importJobIdsFinishedAtLoad);
  }

  isDriveLinkFile(answer: InformationRequestFileAnswer): boolean {
    return !!answer.importJobId && this.#driveLinkImportJobIds().has(answer.importJobId);
  }

  isFileStalled(answer: InformationRequestFileAnswer): boolean {
    return this.#stalledFileKeys().has(syncTrackingKey(answer));
  }

  isNoticeDismissed(questionId: string, reason: IrLeftOutReason): boolean {
    const dismissed = this.#dismissedNotices().get(noticeKey(questionId, reason));
    return dismissed !== undefined && this.#noticeSourceJobIds(questionId, reason).every(sourceJobId => dismissed.has(sourceJobId));
  }

  isStalled(questionId: string): boolean {
    return this.#stalledQuestionIds().has(questionId);
  }

  leftOutFiles(questionId: string): IrLeftOutDriveFiles | null {
    const imports = this.#leftOutImportsByQuestion()[questionId];
    return imports === undefined
      ? null
      : imports.reduce<IrLeftOutDriveFiles | null>(
          (current, latest) => mergeLeftOut(current, latest, this.#markedForDeletion(latest.sourceJobId, questionId)),
          null,
        );
  }

  recordDriveImport(questionId: string, sourceJobId: string): void {
    this.#followedImports.set(new Map(this.#followedImports()).set(sourceJobId, { latest: null, questionId }));
    if (this.#dismissedSourceJobIds().has(sourceJobId)) {
      this.#dismissedSourceJobIds.set(new Set([...this.#dismissedSourceJobIds()].filter(id => id !== sourceJobId)));
    }
    this.#releaseStalledQuestion(questionId);
  }

  recordUpload(questionId: string, importJobIds: readonly string[]): void {
    for (const importJobId of importJobIds) {
      this.#awaitedQuestionByImportJobId.set(importJobId, questionId);
    }
    this.#releaseStalledQuestion(questionId);
  }

  releaseStalledFiles(): void {
    if (this.#stalledFileKeys().size > 0) {
      this.#stalledFileKeys.set(new Set());
    }
  }

  reset(): void {
    this.#awaitedQuestionByImportJobId.clear();
    this.#importJobIdsFinishedAtLoad.clear();
    this.#driveLinkImportJobIds.set(new Set());
    this.#followedImports.set(new Map());
    this.#dismissedSourceJobIds.set(new Set());
    this.#stalledQuestionIds.set(new Set());
    this.#stalledFileKeys.set(new Set());
    this.#dismissedNotices.set(new Map());
    this.#pendingDeletionNames.set(new Map());
    this.#markedForDeletionBySourceJobId.set(new Map());
  }

  setPendingDeletions(questionId: string, fileNames: readonly string[]): void {
    this.#pendingDeletionNames.set(new Map(this.#pendingDeletionNames()).set(questionId, new Set(fileNames)));
  }

  settleImportsFinishedAtLoad(importJobIds: ReadonlySet<string>): void {
    importJobIds.forEach(importJobId => this.#importJobIdsFinishedAtLoad.delete(importJobId));
  }

  stallFiles(answers: readonly InformationRequestFileAnswer[]): void {
    if (answers.length > 0) {
      this.#stalledFileKeys.set(new Set([...this.#stalledFileKeys(), ...answers.map(syncTrackingKey)]));
    }
  }

  stallPendingWork(): void {
    const questionIds = new Set(this.#awaitedQuestionByImportJobId.values());
    for (const { latest, questionId } of this.#followedImports().values()) {
      if (latest === null || isImportInProgress(latest)) {
        questionIds.add(questionId);
      }
    }
    this.#importJobIdsFinishedAtLoad.clear();
    this.#awaitedQuestionByImportJobId.clear();
    if (questionIds.size > 0) {
      this.#stalledQuestionIds.set(new Set([...this.#stalledQuestionIds(), ...questionIds]));
    }
  }

  trackedUploads(questionId: string): readonly FzTrackedUpload[] {
    return this.#trackedUploadsByQuestion()[questionId] ?? NO_TRACKED_UPLOADS;
  }

  #markedForDeletion(sourceJobId: string, questionId: string): ReadonlySet<string> {
    const pendingDeletions = this.#pendingDeletions(questionId);
    return new Set([...(this.#markedForDeletionBySourceJobId().get(sourceJobId) ?? [])].filter(name => pendingDeletions.has(name)));
  }

  #noticeSourceJobIds(questionId: string, reason: IrLeftOutReason): string[] {
    return (this.#leftOutImportsByQuestion()[questionId] ?? [])
      .filter(latest => leftOutFilesFor(latest, reason, this.#markedForDeletion(latest.sourceJobId, questionId)).length > 0)
      .map(latest => latest.sourceJobId);
  }

  #pendingDeletions(questionId: string): ReadonlySet<string> {
    return this.#pendingDeletionNames().get(questionId) ?? new Set();
  }

  #releaseStalledQuestion(questionId: string): void {
    if (this.#stalledQuestionIds().has(questionId)) {
      const stalled = new Set(this.#stalledQuestionIds());
      stalled.delete(questionId);
      this.#stalledQuestionIds.set(stalled);
    }
  }
  #rememberDriveLinkImportJobs(imports: readonly DriveLinkImport[]): void {
    const known = this.#driveLinkImportJobIds();
    const added = imports.flatMap(latest => latest.importJobIds).filter(importJobId => !known.has(importJobId));
    if (added.length > 0) {
      this.#driveLinkImportJobIds.set(new Set([...known, ...added]));
    }
  }
}

function isImportInProgress(latest: DriveLinkImport): boolean {
  return latest.sourceStatus === 'PENDING' || latest.sourceStatus === 'PROCESSING';
}

function isSameImport(a: DriveLinkImport, b: DriveLinkImport): boolean {
  return (
    a.sourceStatus === b.sourceStatus &&
    a.acceptedCount === b.acceptedCount &&
    a.enqueuedCount === b.enqueuedCount &&
    a.importJobIds.length === b.importJobIds.length &&
    a.importJobIds.every((id, index) => id === b.importJobIds[index]) &&
    a.skippedFiles.length === b.skippedFiles.length
  );
}

function toTrackedUpload(sourceJobId: string, latest: DriveLinkImport | null, markedForDeletion: ReadonlySet<string>): FzTrackedUpload {
  if (latest === null) {
    return { ids: [], key: sourceJobId, name: '', status: 'processing' };
  }
  const base = { driveFileId: latest.sourceDriveFileId, ids: latest.importJobIds, key: sourceJobId, name: latest.sourceName };
  if (isImportInProgress(latest)) {
    const progress = latest.acceptedCount > 0 ? { done: latest.enqueuedCount, total: latest.acceptedCount } : null;
    return { ...base, progress, status: 'processing' };
  }
  if (latest.sourceStatus !== 'COMPLETED') {
    return { ...base, status: 'failed' };
  }
  if (latest.importJobIds.length > 0) {
    return { ...base, status: 'uploaded' };
  }
  if (latest.alreadyImportedFiles.some(name => markedForDeletion.has(name))) {
    return { ...base, errorKey: 'markedForDeletion', status: 'failed' };
  }
  return latest.alreadyImportedFiles.length > 0
    ? { ...base, status: 'uploaded' }
    : { ...base, errorKey: 'nothingImported', status: 'failed' };
}

function noticeKey(questionId: string, reason: IrLeftOutReason): string {
  return `${questionId}:${reason}`;
}

function hasFilesLeftOut(latest: DriveLinkImport): boolean {
  return [latest.skippedFiles, latest.alreadyImportedFiles, latest.overLimitFiles, latest.failedFiles].some(files => files.length > 0);
}

function mergeLeftOut(
  current: IrLeftOutDriveFiles | null,
  latest: DriveLinkImport,
  markedForDeletion: ReadonlySet<string>,
): IrLeftOutDriveFiles {
  return {
    alreadyImported: unique([...(current?.alreadyImported ?? []), ...leftOutFilesFor(latest, 'alreadyImported', markedForDeletion)]),
    failed: unique([...(current?.failed ?? []), ...latest.failedFiles]),
    formats:
      latest.skippedFiles.length > 0 ? unique([...(current?.formats ?? []), ...latest.acceptedExtensions]) : (current?.formats ?? []),
    markedForDeletion: unique([...(current?.markedForDeletion ?? []), ...leftOutFilesFor(latest, 'markedForDeletion', markedForDeletion)]),
    overLimit: unique([...(current?.overLimit ?? []), ...latest.overLimitFiles]),
    unsupported: unique([...(current?.unsupported ?? []), ...latest.skippedFiles]),
  };
}

function latestImportPerLink(
  followed: ReadonlyMap<string, FollowedImport>,
): ReadonlyMap<string, { latest: DriveLinkImport; questionId: string }> {
  const latestPerLink = new Map<string, { latest: DriveLinkImport; questionId: string }>();
  for (const { latest, questionId } of followed.values()) {
    if (latest !== null) {
      latestPerLink.set(`${questionId}:${latest.sourceDriveFileId}`, { latest, questionId });
    }
  }
  return latestPerLink;
}

function leftOutFilesFor(latest: DriveLinkImport, reason: IrLeftOutReason, markedForDeletion: ReadonlySet<string>): readonly string[] {
  return {
    alreadyImported: latest.alreadyImportedFiles.filter(name => !markedForDeletion.has(name)),
    failed: latest.failedFiles,
    markedForDeletion: latest.alreadyImportedFiles.filter(name => markedForDeletion.has(name)),
    overLimit: latest.overLimitFiles,
    unsupported: latest.skippedFiles,
  }[reason];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function syncTrackingKey(answer: InformationRequestFileAnswer): string {
  return answer.importJobId || fileAnswerKey(answer);
}
