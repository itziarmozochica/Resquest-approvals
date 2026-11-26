import { IgntButtonIcon } from '@ignite/common';

import { InformationRequestFileAnswer } from './information-request-question.model';

export interface InformationRequestFileTreeFolder {
  files: InformationRequestFileAnswer[];
  folders: InformationRequestFileTreeFolder[];
  /** Collision-safe identity for tracking and collapse state (segments joined with `\0`, which no folder name contains). */
  key: string;
  name: string;
  /** Full segment path from the root down to this folder, e.g. `['Photos', 'Hero']`. */
  path: string[];
}

export interface InformationRequestFileTree {
  /** Files that live directly at the question root (empty or absent `folderPath`). */
  files: InformationRequestFileAnswer[];
  folders: InformationRequestFileTreeFolder[];
}

/** Precomputed render state for one file row, so the template only reads data. */
export interface IrFileTreeFileNode {
  file: InformationRequestFileAnswer;
  inDrive: boolean;
  key: string;
}

/** Precomputed render state for one folder node, so the template only reads data. */
export interface IrFileTreeFolderNode {
  chevron: IgntButtonIcon;
  expanded: boolean;
  files: IrFileTreeFileNode[];
  folders: IrFileTreeFolderNode[];
  key: string;
  name: string;
  /** Human-readable `/`-joined path, used for test hooks. */
  pathLabel: string;
}

export interface IrFileTreeView {
  files: IrFileTreeFileNode[];
  folders: IrFileTreeFolderNode[];
}
