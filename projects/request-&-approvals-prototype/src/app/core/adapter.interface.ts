export interface AdapterInterface<T, U = unknown> {
  fromApi(data: U): T;
}
