import { GroupLeaf, GroupNode } from './group-node.model';
import {
  absorbsLooseLeaves,
  addCluster,
  addLeaf,
  addLeafToCluster,
  detachLeafFromCluster,
  removeLeafFromCluster,
  removeNode,
  reorderNodes,
  ungroupCluster,
} from './ordered-group';

/**
 * A keyed collection of ordered-group lists — the "N lists, one per section" case on top of
 * {@link ordered-group}. The per-section operations delegate to the single-list reducers;
 * {@link transferNode} is the only genuinely new operation — moving a top-level node between
 * two sections.
 */
export interface GroupSection<T, K> {
  key: K;
  nodes: GroupNode<T>[];
}

function mapSection<T, K>(sections: GroupSection<T, K>[], key: K, update: (nodes: GroupNode<T>[]) => GroupNode<T>[]): GroupSection<T, K>[] {
  return sections.map(section => (section.key === key ? { ...section, nodes: update(section.nodes) } : section));
}

export function addLeafInSection<T, K>(sections: GroupSection<T, K>[], key: K, leaf: GroupLeaf<T>): GroupSection<T, K>[] {
  return mapSection(sections, key, nodes => addLeaf(nodes, leaf));
}

export function addLeafToClusterInSection<T, K>(
  sections: GroupSection<T, K>[],
  key: K,
  clusterId: string,
  leaf: GroupLeaf<T>,
): GroupSection<T, K>[] {
  return mapSection(sections, key, nodes => addLeafToCluster(nodes, clusterId, leaf));
}

/**
 * Adds a cluster to the `key` section, reporting whether it absorbed the section's loose leaves
 * (vs. appending an empty cluster). Callers use `absorbed` to decide whether the change is
 * persistable — an empty cluster carries no order slot, so it only persists once populated.
 */
export function addClusterInSection<T, K>(
  sections: GroupSection<T, K>[],
  key: K,
  newClusterId: () => string,
): { absorbed: boolean; sections: GroupSection<T, K>[] } {
  const section = sections.find(current => current.key === key);
  const absorbed = section !== undefined && absorbsLooseLeaves(section.nodes);

  return { absorbed, sections: mapSection(sections, key, nodes => addCluster(nodes, newClusterId)) };
}

export function removeNodeInSection<T, K>(sections: GroupSection<T, K>[], key: K, nodeId: string): GroupSection<T, K>[] {
  return mapSection(sections, key, nodes => removeNode(nodes, nodeId));
}

export function removeLeafFromClusterInSection<T, K>(
  sections: GroupSection<T, K>[],
  key: K,
  clusterId: string,
  leafId: string,
): GroupSection<T, K>[] {
  return mapSection(sections, key, nodes => removeLeafFromCluster(nodes, clusterId, leafId));
}

export function ungroupClusterInSection<T, K>(sections: GroupSection<T, K>[], key: K, clusterId: string): GroupSection<T, K>[] {
  return mapSection(sections, key, nodes => ungroupCluster(nodes, clusterId));
}

export function detachLeafFromClusterInSection<T, K>(
  sections: GroupSection<T, K>[],
  key: K,
  clusterId: string,
  leafId: string,
): GroupSection<T, K>[] {
  return mapSection(sections, key, nodes => detachLeafFromCluster(nodes, clusterId, leafId));
}

export function reorderInSection<T, K>(
  sections: GroupSection<T, K>[],
  key: K,
  previousIndex: number,
  currentIndex: number,
): GroupSection<T, K>[] {
  return mapSection(sections, key, nodes => reorderNodes(nodes, previousIndex, currentIndex));
}

/**
 * Moves the top-level node at `previousIndex` of the `fromKey` section to `currentIndex`
 * of the `toKey` section (CDK `transferArrayItem` semantics). A no-op when either section
 * is missing or there is no node at `previousIndex`. When both keys are equal this reduces
 * to an in-section reorder.
 */
export function transferNode<T, K>(
  sections: GroupSection<T, K>[],
  fromKey: K,
  toKey: K,
  previousIndex: number,
  currentIndex: number,
): GroupSection<T, K>[] {
  if (fromKey === toKey) {
    return reorderInSection(sections, fromKey, previousIndex, currentIndex);
  }

  const fromSection = sections.find(section => section.key === fromKey);
  const toSection = sections.find(section => section.key === toKey);
  if (!fromSection || !toSection) {
    return sections;
  }

  const moved = fromSection.nodes[previousIndex];
  if (moved === undefined) {
    return sections;
  }

  const nextFromNodes = fromSection.nodes.filter((_, index) => index !== previousIndex);
  const nextToNodes = [...toSection.nodes];
  nextToNodes.splice(currentIndex, 0, moved);

  return sections.map(section => {
    if (section.key === fromKey) {
      return { ...section, nodes: nextFromNodes };
    }
    if (section.key === toKey) {
      return { ...section, nodes: nextToNodes };
    }

    return section;
  });
}
