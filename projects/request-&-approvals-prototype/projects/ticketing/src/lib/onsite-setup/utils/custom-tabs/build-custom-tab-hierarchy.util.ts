import type { Session } from '../../../availability/models/session.model';
import type {
  CustomTabHierarchyLeafNode,
  CustomTabHierarchyLevel,
  CustomTabHierarchyParentNode,
} from '../../models/custom-tabs/custom-tab-hierarchy.model';
import {
  CustomTileTargetType,
  isHierarchyTargetType,
  type CustomTile,
  type HierarchyCategory,
  type HierarchyExtraInfo,
  type HierarchyProduct,
} from '../../models/custom-tabs/custom-tile.model';

const ROOT_LEVEL_NAME = 'Custom Tabs';
const DEFAULT_NODE_ORDER = 1;

interface LeafTile {
  kind: 'leaf';
  sessionId: string | null;
  tile: CustomTile;
}

interface ParentTile {
  extraInfo: HierarchyExtraInfo;
  kind: 'parent';
  tile: CustomTile;
}

type ResolvedTile = LeafTile | ParentTile;

export function buildCustomTabHierarchy(tiles: readonly CustomTile[] | null): CustomTabHierarchyLevel | null {
  if (tiles === null) {
    return null;
  }

  const sessions: readonly Session[] = tiles.flatMap(tile => [...tile.sessions]);
  const resolvedTiles: readonly ResolvedTile[] = [
    ...tiles.filter(tile => tile.targetType === CustomTileTargetType.SessionType).flatMap(resolveSessionTypeTile),
    ...tiles.filter(tile => isHierarchyTargetType(tile.targetType)).flatMap(resolveHierarchyTile),
  ];

  const promotedLeafNodes: CustomTabHierarchyLeafNode[] = [];
  const parentNodes: readonly CustomTabHierarchyParentNode[] = resolvedTiles
    .filter((resolved): resolved is ParentTile => resolved.kind === 'parent')
    .flatMap(resolved => {
      const parentNode = toParentNode(resolved.extraInfo, resolved.tile.position, resolved.tile.color, resolved.tile.name);

      if (resolved.tile.targetType !== CustomTileTargetType.ParentHierarchyElement) {
        return [parentNode];
      }

      const { parents, promotedLeafs } = applyFirstLevelFlattening(parentNode);
      promotedLeafNodes.push(...promotedLeafs);

      return parents;
    });

  const leafNodes: readonly CustomTabHierarchyLeafNode[] = [
    ...resolvedTiles
      .filter((resolved): resolved is LeafTile => resolved.kind === 'leaf')
      .map(resolved => ({
        customColor: resolved.tile.color,
        customName: resolved.tile.name,
        order: resolved.tile.position,
        sessionId: resolved.sessionId,
      })),
    ...promotedLeafNodes,
  ];

  return { leafNodes, name: ROOT_LEVEL_NAME, parentNodes, sessions };
}

function resolveSessionTypeTile(tile: CustomTile): readonly ResolvedTile[] {
  if (tile.sessions.length === 0) {
    return [{ kind: 'leaf', sessionId: null, tile }];
  }

  return tile.sessions.map(session => ({ kind: 'leaf', sessionId: String(session.id), tile }));
}

function resolveHierarchyTile(tile: CustomTile): readonly ResolvedTile[] {
  const extraInfo = asHierarchyExtraInfo(tile);
  if (extraInfo === null) {
    return [];
  }

  const singleVariationLeaf = resolveSingleVariationTile(tile, extraInfo);
  if (singleVariationLeaf !== null) {
    return [singleVariationLeaf];
  }

  const products = extraInfo.products ?? [];
  if (products.length === 1 && extraInfo.name === products[0].name) {
    const product = products[0];

    return [
      {
        extraInfo: {
          children: null,
          name: product.name,
          placeCityTimezone: extraInfo.placeCityTimezone,
          productVariations: product.productVariations,
          products: null,
        },
        kind: 'parent',
        tile: { ...tile, name: tile.name === null || tile.name === '' ? product.name : tile.name },
      },
    ];
  }

  return [{ extraInfo, kind: 'parent', tile }];
}

function resolveSingleVariationTile(tile: CustomTile, extraInfo: HierarchyExtraInfo): LeafTile | null {
  const variations = extraInfo.productVariations ?? [];
  const hasOnlyOneVariation = variations.length === 1 && (extraInfo.products ?? []).length === 0 && (extraInfo.children ?? []).length === 0;

  if (!hasOnlyOneVariation) {
    return null;
  }

  const sessionId = variations[0].sessionId;
  const session = tile.sessions.find(candidate => candidate.id === Number(sessionId));
  if (session === undefined) {
    return null;
  }

  const name = tile.name === null || tile.name === '' ? session.title : tile.name;

  return { kind: 'leaf', sessionId: String(session.id), tile: { ...tile, name } };
}

function asHierarchyExtraInfo(tile: CustomTile): HierarchyExtraInfo | null {
  const extraInfo = tile.extraInfo;
  if (extraInfo === null || !('name' in extraInfo)) {
    return null;
  }

  return extraInfo;
}

function toParentNode(
  extraInfo: HierarchyExtraInfo,
  order: number,
  customColor: string | null,
  customName: string | null,
): CustomTabHierarchyParentNode {
  return {
    customColor,
    customName,
    leafNodes: toVariationLeafNodes(extraInfo.productVariations, order),
    name: customName === null || customName === '' ? extraInfo.name : customName,
    order,
    parentNodes: [...(extraInfo.children ?? []).map(toCategoryParentNode), ...(extraInfo.products ?? []).map(toProductParentNode)],
  };
}

function toCategoryParentNode(category: HierarchyCategory): CustomTabHierarchyParentNode {
  return {
    customColor: null,
    customName: null,
    leafNodes: toVariationLeafNodes(category.productVariations, DEFAULT_NODE_ORDER),
    name: category.name,
    order: DEFAULT_NODE_ORDER,
    parentNodes: [...(category.children ?? []).map(toCategoryParentNode), ...(category.products ?? []).map(toProductParentNode)],
  };
}

function toProductParentNode(product: HierarchyProduct): CustomTabHierarchyParentNode {
  return {
    customColor: null,
    customName: null,
    leafNodes: toVariationLeafNodes(product.productVariations, DEFAULT_NODE_ORDER),
    name: product.name,
    order: DEFAULT_NODE_ORDER,
    parentNodes: [],
  };
}

function toVariationLeafNodes(variations: readonly { sessionId: string }[] | null, order: number): readonly CustomTabHierarchyLeafNode[] {
  return (variations ?? []).map(
    (variation): CustomTabHierarchyLeafNode => ({
      customColor: null,
      customName: null,
      order,
      sessionId: variation.sessionId,
    }),
  );
}

function applyFirstLevelFlattening(parentNode: CustomTabHierarchyParentNode): {
  parents: readonly CustomTabHierarchyParentNode[];
  promotedLeafs: readonly CustomTabHierarchyLeafNode[];
} {
  const parents: CustomTabHierarchyParentNode[] = [];
  const promotedLeafs: CustomTabHierarchyLeafNode[] = [];

  for (const childParent of parentNode.parentNodes) {
    if (childParent.parentNodes.length === 0 && childParent.leafNodes.length === 1) {
      promotedLeafs.push(childParent.leafNodes[0]);
    } else {
      parents.push(childParent);
    }
  }

  promotedLeafs.push(...parentNode.leafNodes);

  return { parents, promotedLeafs };
}
