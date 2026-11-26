export interface IdData<T extends string | number> {
  id: T;
}

/**
 * If there is name, there is always id.
 */
export interface NameData<T extends string | number> extends IdData<T> {
  name: string;
}

export interface TitleData {
  title: string;
}
