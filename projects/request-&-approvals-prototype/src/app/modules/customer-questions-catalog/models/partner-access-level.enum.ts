/**
 * Presentation grouping of a question's `canAssign` / `canModify` capabilities into
 * the four levels of access a partner can be granted over a `PARTNER_OWNED` question.
 */
export enum PartnerAccessLevel {
  ASSIGN_ACCESS = 'assign_access',
  EDIT_ACCESS = 'edit_access',
  FULL_ACCESS = 'full_access',
  VIEW_ACCESS = 'view_access',
}
