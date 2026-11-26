import {
  InformationRequestFileTree,
  InformationRequestFileTreeFolder,
  IrFileTreeFileNode,
  IrFileTreeFolderNode,
  IrFileTreeView,
} from './information-request-file-tree.model';
import { fileAnswerKey, InformationRequestFileAnswer, isFileAnswerInDrive } from './information-request-question.model';

const KEY_SEPARATOR = '\u0000';

/**
 * Groups a flat list of file answers into a folder tree using each file's `folderPath`.
 * Files with no path (legacy answers, root uploads) stay at the top level, so a response
 * without any `folderPath` yields a flat tree that renders exactly as before.
 * Two source folders that resolve to the same name at the same level are merged, mirroring
 * the backend's name-based Drive nesting. Folders and files are both sorted alphabetically.
 */
export function buildInformationRequestFileTree(files: readonly InformationRequestFileAnswer[]): InformationRequestFileTree {
  const root: InformationRequestFileTree = { files: [], folders: [] };
  for (const file of files) {
    const segments = normalizeSegments(file.folderPath);
    if (segments.length === 0) {
      root.files.push(file);
      continue;
    }
    let folders = root.folders;
    let leaf: InformationRequestFileTreeFolder | undefined;
    const pathSoFar: string[] = [];
    for (const name of segments) {
      pathSoFar.push(name);
      leaf = folders.find(folder => folder.name === name);
      if (!leaf) {
        leaf = { files: [], folders: [], key: pathSoFar.join(KEY_SEPARATOR), name, path: [...pathSoFar] };
        folders.push(leaf);
      }
      folders = leaf.folders;
    }
    leaf?.files.push(file);
  }
  sortTreeDeep(root);
  return root;
}

/** Derives the precomputed view nodes the tree template renders, from the data tree + collapse state. */
export function toIrFileTreeView(tree: InformationRequestFileTree, collapsedKeys: ReadonlySet<string>): IrFileTreeView {
  return {
    files: tree.files.map(toFileNode),
    folders: tree.folders.map(folder => toFolderNode(folder, collapsedKeys)),
  };
}

function toFileNode(file: InformationRequestFileAnswer): IrFileTreeFileNode {
  return { file, inDrive: isFileAnswerInDrive(file), key: fileAnswerKey(file) };
}

function toFolderNode(folder: InformationRequestFileTreeFolder, collapsedKeys: ReadonlySet<string>): IrFileTreeFolderNode {
  const expanded = !collapsedKeys.has(folder.key);
  return {
    chevron: { name: expanded ? 'chevron-down' : 'chevron-right', variant: 'light' },
    expanded,
    files: folder.files.map(toFileNode),
    folders: folder.folders.map(child => toFolderNode(child, collapsedKeys)),
    key: folder.key,
    name: folder.name,
    pathLabel: folder.path.join('/'),
  };
}

function normalizeSegments(folderPath: string[] | null | undefined): string[] {
  if (!Array.isArray(folderPath)) {
    return [];
  }
  return folderPath.filter((segment): segment is string => typeof segment === 'string' && segment.length > 0);
}

function sortTreeDeep(node: InformationRequestFileTree | InformationRequestFileTreeFolder): void {
  node.folders.sort((a, b) => a.name.localeCompare(b.name));
  node.files.sort((a, b) => a.originalName.localeCompare(b.originalName));
  for (const folder of node.folders) {
    sortTreeDeep(folder);
  }
}
