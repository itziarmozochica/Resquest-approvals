import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

import { TagApiResponse, TagRequest } from '../models/tag-response.model';
import { Tag, TagDraft } from '../models/tag.model';
import { isTagColor } from '../utils/tag-color.util';
import { toTagTypeOrNull } from '../utils/tag-type.util';

@Injectable({
  providedIn: 'root',
})
export class TagsAdapter implements AdapterInterface<BaseResponse<Tag[]>, BaseResponse<TagApiResponse[] | null>> {
  fromApi(response: BaseResponse<TagApiResponse[] | null>): BaseResponse<Tag[]> {
    return new BaseResponse<Tag[]>(this.#mapTags(response.data), response.error);
  }

  toApi(draft: TagDraft): TagRequest {
    return { color: draft.color, icon: draft.icon, name: draft.name, tag_type_id: draft.typeId };
  }

  #mapTag(tag: TagApiResponse): Tag {
    return {
      // The palette is a closed set, so a colour we cannot map is dropped and the chip degrades to text.
      color: isTagColor(tag.color) ? tag.color : null,
      // `icon` stays raw: narrowing it to the curated grid would let the next full replace erase a
      // name this client does not offer.
      icon: tag.icon,
      id: tag.id,
      name: tag.name,
      productCount: tag.product_count,
      // A type the client cannot read degrades to uncategorised, the way an unmappable colour does.
      type: toTagTypeOrNull(tag.tag_type),
    };
  }

  #mapTags(data: TagApiResponse[] | null): Tag[] | null {
    if (data == null) {
      return null;
    }

    return data.map(tag => this.#mapTag(tag));
  }
}
