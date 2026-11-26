import { NoteAudienceET } from '../../../models/customer-note/note-audience.model';
import { NoteChanges, NoteEditFormModeET, NoteInput } from '../notes-edit-form/notes-edit-form.component';

export interface NoteDraft {
  audience: NoteAudienceET;
  availableAudiences: NoteAudienceET[];
  mode: NoteEditFormModeET;
  note: NoteInput | null;
  hasSaveError?: boolean;
  /** What the user typed before the save failed, restored over `note` when the form reopens. */
  pendingChanges?: NoteChanges | null;
}
