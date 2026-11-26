/**
 * Generic model for an ordered list whose items are either a single leaf or a *cluster*
 * of leaves that share an `order` (rendered together, in random order). Each leaf carries
 * a stable `id` so it can be tracked and moved.
 */

export interface GroupLeaf<T> {
  id: string;
  value: T;
}

export interface GroupCluster<T> {
  id: string;
  leaves: GroupLeaf<T>[];
}

/**
 * `draggable` is optional metadata a consumer can populate (via `buildNodeViews`) to gate
 * whether the node may be reordered; it is not maintained by the mutation reducers.
 */
export type GroupNode<T> =
  | { leaf: GroupLeaf<T>; type: 'leaf'; draggable?: boolean }
  | { cluster: GroupCluster<T>; type: 'cluster'; draggable?: boolean };

export interface GroupNodeView<T> {
  groupNumber: number | null;
  node: GroupNode<T>;
  order: number;
}
