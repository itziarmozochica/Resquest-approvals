export interface ValidationHistoryEntryDTO {
  datetime: string;
  id: number;
  is_expired: boolean;
  place_id: number | null;
  profile: {
    id: string;
    name: string | null;
  } | null;
  type: string;
  validator: {
    email: string;
    full_name: string | null;
    id: string;
  } | null;
}

export interface CodeQueryCodeData {
  code: string;
  validated_at_history?: ValidationHistoryEntryDTO[] | null;
}

export interface CodeQueryResponseData {
  tickets: { codes?: CodeQueryCodeData[] }[];
}

export interface ValidationHistoryEntry {
  datetime: string;
  id: number;
  isExpired: boolean;
  placeId: number | null;
  profile: Profile | null;
  type: string;
  validator: Validator | null;
}

export interface Profile {
  id: string;
  name: string | null;
}

export interface Validator {
  email: string;
  fullName: string | null;
  id: string;
}
