export type {
  AnnouncementContext,
  AnnouncementDescriptor,
  AnnouncementKey,
  AnnouncementRegistration,
} from './lib/models/announcement.model';
export { ANNOUNCEMENTS_API, type AnnouncementsApiPort } from './lib/ports/announcements-api.port';
export { ANNOUNCEMENTS_CONTEXT, type AnnouncementsContextPort } from './lib/ports/announcements-context.port';
export { ANNOUNCEMENTS_DIALOG, type AnnouncementDialogHandle, type AnnouncementsDialogPort } from './lib/ports/announcements-dialog.port';
export { provideOneTimeAnnouncements } from './lib/providers/provide-one-time-announcements';
export { AnnouncementService } from './lib/services/announcement.service';
