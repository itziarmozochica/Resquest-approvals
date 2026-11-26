import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';
import {
  GroupedSessionTypeCapacities,
  SessionTypeCapacitiesByGroup,
  SessionTypeCapacitiesDTO,
  SessionTypeCapacity,
  SessionTypeCapacityDTO,
  SessionTypeGroupCapacity,
  SessionTypeGroupCapacityDTO,
} from '../../models/session-type/session-type-capacity.model';

type BaseResponseDTO<T> = Pick<BaseResponse<T>, 'data' | 'error'>;

export type SessionTypeCapacitiesResponseDTO = BaseResponseDTO<SessionTypeCapacitiesDTO>;

@Injectable({
  providedIn: 'root',
})
export class SessionTypeCapacitiesByGroupAdapter
  implements AdapterInterface<SessionTypeCapacitiesByGroup, SessionTypeCapacitiesResponseDTO>
{
  fromApi(response: SessionTypeCapacitiesResponseDTO): SessionTypeCapacitiesByGroup {
    if (response.error) {
      throw response.error;
    }

    if (response.data === null) {
      throw new Error('Response data is null');
    }

    return this.getData(response.data);
  }

  private getData(sessionTypeCapacitiesDTO: SessionTypeCapacitiesDTO): SessionTypeCapacitiesByGroup {
    const sessionTypesWithoutGroup: Array<SessionTypeCapacity> = [];
    const sessionTypeGroupsMapping: Map<number, GroupedSessionTypeCapacities> = new Map();

    sessionTypeCapacitiesDTO.groups.forEach(sessionTypeGroupCapacityDTO => {
      const sessionTypeGroupCapacity = this.adaptGroup(sessionTypeGroupCapacityDTO);
      const groupedSessionTypeCapacities = {
        group: sessionTypeGroupCapacity,
        sessionTypes: [],
      } as GroupedSessionTypeCapacities;
      sessionTypeGroupsMapping.set(sessionTypeGroupCapacity.id, groupedSessionTypeCapacities);
    });

    sessionTypeCapacitiesDTO.session_types.forEach(sessionTypeCapacityDTO => {
      const sessionTypeCapacity = this.adaptSessionType(sessionTypeCapacityDTO);
      if (!sessionTypeCapacity.groupId) {
        sessionTypesWithoutGroup.push(sessionTypeCapacity);
      } else {
        sessionTypeGroupsMapping.get(sessionTypeCapacity.groupId)?.sessionTypes.push(sessionTypeCapacity);
      }
    });

    const sessionTypesWithGroup: Array<GroupedSessionTypeCapacities> = Array.from(sessionTypeGroupsMapping.values());

    return { sessionTypesWithoutGroup, sessionTypesWithGroup } as SessionTypeCapacitiesByGroup;
  }

  private adaptGroup(sessionTypeGroupCapacityDTO: SessionTypeGroupCapacityDTO): SessionTypeGroupCapacity {
    return {
      id: sessionTypeGroupCapacityDTO.id,
      name: sessionTypeGroupCapacityDTO.name,
      defaultCapacity: sessionTypeGroupCapacityDTO.default_capacity,
    } as SessionTypeGroupCapacity;
  }

  private adaptSessionType(sessionTypeCapacityDTO: SessionTypeCapacityDTO): SessionTypeCapacity {
    return {
      id: sessionTypeCapacityDTO.id,
      label: sessionTypeCapacityDTO.label,
      isAddOn: sessionTypeCapacityDTO.is_add_on,
      defaultCapacity: sessionTypeCapacityDTO.default_capacity,
      groupId: sessionTypeCapacityDTO.group_id,
    } as SessionTypeCapacity;
  }
}
