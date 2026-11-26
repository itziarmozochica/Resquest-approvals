/** How the booking questions came in a Prepare V2.1 answer. */
export enum PreparedCartBookingQuestionsStatus {
  /** Every question of the cart, pre- and post-booking, read with the prepare. */
  AVAILABLE = 'available',
  /** `booking_questions` is neither a list nor null, or one of its items has no `question_id` or `when`. */
  MALFORMED = 'malformed',
  /** partners could not read them (`null`), or answered the bare cart before it returned them. */
  UNAVAILABLE = 'unavailable',
}
