import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseAdapter } from '@fz-original/app/core/base.adapter';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { parseHttpUrl } from '@fz-original/app/shared/utils/http-url.util';

import { ZiflowFolder, ZiflowFolderApiDto } from '../models/ziflow-folder.model';

function toHttpsUrl(value: string | null | undefined): string | null {
  const url = parseHttpUrl(value ?? undefined);
  return url?.protocol === 'https:' ? url.href : null;
}

function toZiflowFolder(dto: ZiflowFolderApiDto): ZiflowFolder {
  return {
    folderId: dto.folder_id,
    folderName: dto.folder_name,
    folderUrl: toHttpsUrl(dto.folder_url),
    proofCount: dto.proof_count ?? 0,
    latestProofCreatedAt: dto.latest_proof_created_at ?? null,
    thumbnailUrl: dto.thumbnail_url ?? null,
  };
}

@Injectable({ providedIn: 'root' })
export class ZiflowFoldersAdapter
  extends BaseAdapter
  implements AdapterInterface<BaseResponse<ZiflowFolder[] | null>, BaseResponse<ZiflowFolderApiDto[]>>
{
  fromApi(response: BaseResponse<ZiflowFolderApiDto[]>): BaseResponse<ZiflowFolder[] | null> {
    const data: ZiflowFolder[] = (response?.data ?? []).map(toZiflowFolder);
    return new BaseResponse<ZiflowFolder[]>(data, this.getError(response?.error));
  }

  fromApiSingle(response: BaseResponse<ZiflowFolderApiDto>): BaseResponse<ZiflowFolder | null> {
    const folder = response?.data ? toZiflowFolder(response.data) : null;
    return new BaseResponse<ZiflowFolder | null>(folder, this.getError(response?.error));
  }
}
