export interface CustomerNoteAuthorDto {
  email: string | null;
  full_name: string | null;
  id: number | null;
}

export interface CustomerNoteDto {
  created_at: string;
  created_by: CustomerNoteAuthorDto;
  id: string;
  message: string;
  title: string | null;
  updated_at: string | null;
  updated_by: CustomerNoteAuthorDto | null;
}

export interface CustomerNotesDataDto {
  notes: CustomerNoteDto[];
}

export interface CreatedCustomerNoteDataDto {
  id: string;
}

export interface CustomerNoteRequestDto {
  message: string;
  title: string | null;
}
