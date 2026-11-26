export interface ZiflowFolder {
  folderId: string;
  folderName: string;
  folderUrl: string | null;
  proofCount: number;
  latestProofCreatedAt: string | null;
  thumbnailUrl: string | null;
}

export interface ZiflowFolderSelection {
  folder: string | null;
  thumbnailUrl: string | null;
}

export interface ZiflowFolderApiDto {
  folder_id: string;
  folder_name: string;
  folder_url: string | null;
  proof_count: number;
  latest_proof_created_at: string | null;
  thumbnail_url: string | null;
}
