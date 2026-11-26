export interface AddressLookupSuggestionResponse {
  address_identifier: string;
  suggestion: string;
  type: 'address' | 'container' | null;
}
