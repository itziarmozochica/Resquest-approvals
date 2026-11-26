import { groupByOrder } from './group-by-order.util';
import { GroupLeaf, GroupNode, GroupNodeView } from './group-node.model';

/** Builds the initial nodes from an ordered set of leaves, clustering those that share an order. */
export function buildNodes<T>(leaves: GroupLeaf<T>[], getOrder: (value: T) => number | null, newClusterId: () => string): GroupNode<T>[] {
  return groupByOrder(leaves, leaf => getOrder(leaf.value)).map(unit =>
    unit.length > 1 ? { cluster: { id: newClusterId(), leaves: unit }, type: 'cluster' } : { leaf: unit[0], type: 'leaf' },
  );
}

/**
 * Projects nodes into views with a positional `order` and a `groupNumber` for clusters. Numbering is
 * 1-based by default; pass `orderOffset` / `groupOffset` to continue a running count across several
 * lists (e.g. one global sequence spanning multiple sections). An empty cluster is still numbered as a
 * group but does not consume an `order` slot — it holds no items, so it must not shift the order of
 * anything after it. When `isDraggable` is provided, each node view is flagged as draggable if the
 * node satisfies the predicate — a leaf directly, or a cluster only when *every* leaf satisfies it.
 */
export function buildNodeViews<T>(
  nodes: GroupNode<T>[],
  isDraggable?: (value: T) => boolean,
  orderOffset = 0,
  groupOffset = 0,
): GroupNodeView<T>[] {
  let order = orderOffset;
  let groupNumber = groupOffset;

  return nodes.map(node => {
    const isEmptyCluster = node.type === 'cluster' && node.cluster.leaves.length === 0;

    return {
      groupNumber: node.type === 'cluster' ? ++groupNumber : null,
      node: isDraggable ? withDraggable(node, isDraggable) : node,
      order: isEmptyCluster ? order : ++order,
    };
  });
}

/** Flattens every leaf (top-level and clustered) in document order. */
export function flattenLeaves<T>(nodes: GroupNode<T>[]): GroupLeaf<T>[] {
  return nodes.flatMap(node => (node.type === 'leaf' ? [node.leaf] : node.cluster.leaves));
}

/** Maps every leaf value while preserving the node/cluster structure and leaf ids. */
export function mapLeafValues<T, U>(nodes: GroupNode<T>[], map: (value: T) => U): GroupNode<U>[] {
  return nodes.map(node =>
    node.type === 'leaf'
      ? { leaf: { id: node.leaf.id, value: map(node.leaf.value) }, type: 'leaf' }
      : {
          cluster: { id: node.cluster.id, leaves: node.cluster.leaves.map(leaf => ({ id: leaf.id, value: map(leaf.value) })) },
          type: 'cluster',
        },
  );
}

/** Maps every leaf to a payload item, tagging it with its node's positional order from the views. */
export function toOrderedPayload<T, R>(views: GroupNodeView<T>[], map: (value: T, order: number) => R): R[] {
  const payload: R[] = [];

  for (const { node, order } of views) {
    if (node.type === 'leaf') {
      payload.push(map(node.leaf.value, order));
      continue;
    }

    for (const leaf of node.cluster.leaves) {
      payload.push(map(leaf.value, order));
    }
  }

  return payload;
}

export function addLeaf<T>(nodes: GroupNode<T>[], leaf: GroupLeaf<T>): GroupNode<T>[] {
  return [...nodes, { leaf, type: 'leaf' }];
}

export function addLeafToCluster<T>(nodes: GroupNode<T>[], clusterId: string, leaf: GroupLeaf<T>): GroupNode<T>[] {
  return nodes.map(node =>
    node.type === 'cluster' && node.cluster.id === clusterId
      ? { cluster: { ...node.cluster, leaves: [...node.cluster.leaves, leaf] }, type: 'cluster' }
      : node,
  );
}

/** Whether {@link addCluster} would wrap the existing loose leaves into the new cluster (vs. appending an empty one). */
export function absorbsLooseLeaves<T>(nodes: GroupNode<T>[]): boolean {
  return nodes.length > 0 && !nodes.some(node => node.type === 'cluster');
}

/** Adds a cluster. The first cluster absorbs the existing loose leaves; further clusters start empty. */
export function addCluster<T>(nodes: GroupNode<T>[], newClusterId: () => string): GroupNode<T>[] {
  if (absorbsLooseLeaves(nodes)) {
    const leaves = nodes.filter((node): node is Extract<GroupNode<T>, { type: 'leaf' }> => node.type === 'leaf').map(node => node.leaf);

    return [{ cluster: { id: newClusterId(), leaves }, type: 'cluster' }];
  }

  return [...nodes, { cluster: { id: newClusterId(), leaves: [] }, type: 'cluster' }];
}

export function removeNode<T>(nodes: GroupNode<T>[], nodeId: string): GroupNode<T>[] {
  return nodes.filter(node => nodeId !== (node.type === 'leaf' ? node.leaf.id : node.cluster.id));
}

export function removeLeafFromCluster<T>(nodes: GroupNode<T>[], clusterId: string, leafId: string): GroupNode<T>[] {
  return nodes.map(node =>
    node.type === 'cluster' && node.cluster.id === clusterId
      ? { cluster: { ...node.cluster, leaves: node.cluster.leaves.filter(leaf => leaf.id !== leafId) }, type: 'cluster' }
      : node,
  );
}

/**
 * Detaches a single leaf from a cluster, re-inserting it as a loose leaf right after the cluster.
 * The rest of the cluster stays grouped; an emptied cluster is dropped.
 */
export function detachLeafFromCluster<T>(nodes: GroupNode<T>[], clusterId: string, leafId: string): GroupNode<T>[] {
  const index = nodes.findIndex(node => node.type === 'cluster' && node.cluster.id === clusterId);
  if (index === -1) {
    return nodes;
  }

  const cluster = (nodes[index] as Extract<GroupNode<T>, { type: 'cluster' }>).cluster;
  const detached = cluster.leaves.find(leaf => leaf.id === leafId);
  if (!detached) {
    return nodes;
  }

  const remaining = cluster.leaves.filter(leaf => leaf.id !== leafId);
  const clusterNodes: GroupNode<T>[] = remaining.length > 0 ? [{ cluster: { ...cluster, leaves: remaining }, type: 'cluster' }] : [];

  return [...nodes.slice(0, index), ...clusterNodes, { leaf: detached, type: 'leaf' }, ...nodes.slice(index + 1)];
}

/** Dissolves a cluster, splicing its leaves back into the list as loose leaves at the cluster's position. */
export function ungroupCluster<T>(nodes: GroupNode<T>[], clusterId: string): GroupNode<T>[] {
  const index = nodes.findIndex(node => node.type === 'cluster' && node.cluster.id === clusterId);
  if (index === -1) {
    return nodes;
  }

  const cluster = (nodes[index] as Extract<GroupNode<T>, { type: 'cluster' }>).cluster;
  const loose: GroupNode<T>[] = cluster.leaves.map(leaf => ({ leaf, type: 'leaf' }));

  return [...nodes.slice(0, index), ...loose, ...nodes.slice(index + 1)];
}

export function reorderNodes<T>(nodes: GroupNode<T>[], previousIndex: number, currentIndex: number): GroupNode<T>[] {
  const reordered = [...nodes];
  const [moved] = reordered.splice(previousIndex, 1);
  if (moved !== undefined) {
    reordered.splice(currentIndex, 0, moved);
  }

  return reordered;
}

function withDraggable<T>(node: GroupNode<T>, isDraggable: (value: T) => boolean): GroupNode<T> {
  return node.type === 'leaf'
    ? { draggable: isDraggable(node.leaf.value), leaf: node.leaf, type: 'leaf' }
    : { cluster: node.cluster, draggable: node.cluster.leaves.every(leaf => isDraggable(leaf.value)), type: 'cluster' };
}
