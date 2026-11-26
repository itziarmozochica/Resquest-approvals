import { ApprovalAsset } from '../models/approval.model';

export interface ApprovalAssetTreeFolder {
  assets: ApprovalAsset[];
  /**
   * Every asset in this folder and all nested subfolders, flattened once at build time so
   * per-folder aggregates (selection, rollup, bulk review) never re-walk the subtree.
   */
  descendants: ApprovalAsset[];
  folders: ApprovalAssetTreeFolder[];
  /** Collision-safe identity for tracking and collapse state (segments joined with `\0`, which no folder name contains). */
  key: string;
  name: string;
  /** Full segment path from the root down to this folder, e.g. `['Banners', 'Web']`. */
  path: string[];
  /** Human-readable `/`-joined path, used for test hooks. */
  pathLabel: string;
}

export interface ApprovalAssetTree {
  /** Assets that live at the approval root (empty `folderPath`: legacy or attachment uploads). */
  assets: ApprovalAsset[];
  folders: ApprovalAssetTreeFolder[];
}

/**
 * Groups a flat list of approval assets into a folder tree using each asset's `folderPath`.
 * Assets with no path stay at the top level, so an approval without any `folder_path` in the
 * read API renders exactly as before. Two source folders that resolve to the same name at the
 * same level are merged, mirroring the backend's name-based Drive nesting.
 */
export function buildApprovalAssetTree(assets: readonly ApprovalAsset[]): ApprovalAssetTree {
  const root: ApprovalAssetTree = { assets: [], folders: [] };
  for (const asset of assets) {
    const segments = normalizeSegments(asset.folderPath);
    if (segments.length === 0) {
      root.assets.push(asset);
      continue;
    }
    let folders = root.folders;
    let leaf: ApprovalAssetTreeFolder | undefined;
    const pathSoFar: string[] = [];
    for (const name of segments) {
      pathSoFar.push(name);
      leaf = folders.find(folder => folder.name === name);
      if (!leaf) {
        leaf = {
          assets: [],
          descendants: [],
          folders: [],
          key: pathSoFar.join('\0'),
          name,
          path: [...pathSoFar],
          pathLabel: toPathLabel(pathSoFar),
        };
        folders.push(leaf);
      }
      leaf.descendants.push(asset);
      folders = leaf.folders;
    }
    leaf?.assets.push(asset);
  }
  sortFoldersDeep(root.folders);
  return root;
}

// Escapes literal slashes (and the escape character itself) per segment so a folder named
// `Banners/Web` labels as `Banners\/Web` and cannot collide with nested `Banners` > `Web` —
// keeping the human-readable label as collision-safe as the NUL-joined key.
function toPathLabel(path: readonly string[]): string {
  return path.map(segment => segment.replace(/\\/g, '\\\\').replace(/\//g, '\\/')).join('/');
}

function normalizeSegments(folderPath: string[] | null | undefined): string[] {
  if (!Array.isArray(folderPath)) {
    return [];
  }
  return folderPath.filter((segment): segment is string => typeof segment === 'string' && segment.length > 0);
}

function sortFoldersDeep(folders: ApprovalAssetTreeFolder[]): void {
  folders.sort((a, b) => a.name.localeCompare(b.name));
  for (const folder of folders) {
    sortFoldersDeep(folder.folders);
  }
}
