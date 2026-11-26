export interface CustomerNoteAuthor {
  email: string | null;
  fullName: string | null;
  id: number | null;
}

export interface CustomerNote {
  createdAt: string;
  createdBy: CustomerNoteAuthor;
  id: string;
  message: string;
  title: string | null;
  updatedAt: string | null;
  updatedBy: CustomerNoteAuthor | null;
}

export interface CustomerNoteChanges {
  message: string;
  title: string | null;
}

export interface CustomerNoteUpdate {
  changes: CustomerNoteChanges;
  noteId: string;
}

/** The writes that bring the customer notes stored on a record to what a draft holds. */
export interface CustomerNoteSync {
  creates: CustomerNoteChanges[];
  deletes: string[];
  updates: CustomerNoteUpdate[];
}
