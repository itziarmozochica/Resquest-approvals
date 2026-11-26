import { Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';

import { AssignedTag, TagAssignment } from '../models/tag-assignment.model';
import { AssignedTagApiResponse, TagAssignmentApiResponse } from '../models/tag-response.model';
import { isTagColor } from '../utils/tag-color.util';
import { toTagTypeOrNull } from '../utils/tag-type.util';

@Injectable({
  providedIn: 'root',
})
export class TagAssignmentsAdapter {
  fromApi(response: BaseResponse<TagAssignmentApiResponse[] | null>): BaseResponse<TagAssignment[]> {
    return new BaseResponse<TagAssignment[]>(
      (response.data ?? []).map(assignment => this.#toAssignment(assignment)),
      response.error,
    );
  }

  #toAssignment(assignment: TagAssignmentApiResponse): TagAssignment {
    return {
      tags: assignment.tags.map(tag => this.#toTag(tag)),
      targetId: assignment.target_id,
    };
  }

  #toTag(tag: AssignedTagApiResponse): AssignedTag {
    return {
      color: isTagColor(tag.color) ? tag.color : null,
      icon: tag.icon,
      id: tag.id,
      name: tag.name,
      type: toTagTypeOrNull(tag.tag_type),
    };
  }
}
