export enum DriveSyncStatus {
  S3_ONLY = 'S3_ONLY',
  IMPORTING_FROM_DRIVE = 'IMPORTING_FROM_DRIVE',
  SYNCING_TO_DRIVE = 'SYNCING_TO_DRIVE',
  IN_DRIVE = 'IN_DRIVE',
  DRIVE_SYNC_FAILED = 'DRIVE_SYNC_FAILED',
  DRIVE_IMPORT_STALLED = 'DRIVE_IMPORT_STALLED',
}

export function parseDriveSyncStatus(value: string | null | undefined): DriveSyncStatus {
  if (!value) return DriveSyncStatus.S3_ONLY;
  return Object.values(DriveSyncStatus).includes(value as DriveSyncStatus) ? (value as DriveSyncStatus) : DriveSyncStatus.S3_ONLY;
}

export function isDriveSyncInProgress(status: DriveSyncStatus): boolean {
  return status === DriveSyncStatus.IMPORTING_FROM_DRIVE || status === DriveSyncStatus.SYNCING_TO_DRIVE;
}

export function isOutsideDrive(status: DriveSyncStatus): boolean {
  return isDriveSyncInProgress(status) || status === DriveSyncStatus.DRIVE_SYNC_FAILED || status === DriveSyncStatus.DRIVE_IMPORT_STALLED;
}

export function isDriveSyncStopped(status: DriveSyncStatus): boolean {
  return status === DriveSyncStatus.DRIVE_SYNC_FAILED || status === DriveSyncStatus.DRIVE_IMPORT_STALLED;
}
