export interface ModificationTicketSlot {
  sourceIndex: number; // 1-based
  sessionId: number;
  sessionTypeId: number;
  label: string;
}

export interface ModificationAttendeeRemovalRow {
  sourceIndex: number;
  sessionTypeId: number;
  /** Ticket type / session label, e.g. "Adult" */
  label: string;
  /** Readable Q&A lines so the partner can identify the attendee */
  answerLines: string[];
  removable: boolean;
  /**
   * Ticket type fully dropped from the target selection (qty → 0).
   * Auto-removed — hidden from the picker; never kept.
   */
  autoRemoved?: boolean;
}

/** In-memory buffer for one gated Review changes attempt (never persisted mid-flow). */
export interface ModificationBookingQuestionsSessionBuffer {
  /** 1-based baseline indices; `undefined` marks a new target slot with no survivor. */
  keptSourceIndices: Array<number | undefined>;
  targetCount: number;
}
