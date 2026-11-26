type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject | unknown[] | undefined;
export interface JsonObject {
  [key: string]: JsonValue;
}
