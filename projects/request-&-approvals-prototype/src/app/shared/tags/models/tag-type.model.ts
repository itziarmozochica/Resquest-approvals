export const tagTypeNameMaxLength = 40;

export interface TagType {
  readonly id: number;
  readonly name: string;
  // A hint, never a key: the values are not unique and go non-contiguous after a delete.
  readonly sortOrder: number;
}

export type TagTypeDraft = Pick<TagType, 'name'>;
