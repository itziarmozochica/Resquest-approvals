import { CustomerNote, CustomerNoteAuthor, CustomerNoteChanges } from '../../../../models/customer-note/customer-note.model';
import { CustomerNoteAuthorDto, CustomerNoteDto, CustomerNoteRequestDto } from '../dtos/customer-note.dto';

export function toCustomerNote(dto: CustomerNoteDto): CustomerNote {
  return {
    createdAt: dto.created_at,
    createdBy: toCustomerNoteAuthor(dto.created_by),
    id: dto.id,
    message: dto.message,
    title: dto.title,
    updatedAt: dto.updated_at,
    updatedBy: dto.updated_by ? toCustomerNoteAuthor(dto.updated_by) : null,
  };
}

export function toCustomerNoteRequestDto(changes: CustomerNoteChanges): CustomerNoteRequestDto {
  return {
    message: changes.message,
    title: changes.title,
  };
}

function toCustomerNoteAuthor(dto: CustomerNoteAuthorDto): CustomerNoteAuthor {
  return {
    email: dto.email,
    fullName: dto.full_name,
    id: dto.id,
  };
}
