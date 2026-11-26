import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';
import { Graph, GraphData } from '../../models/graph/graph.model';
import { SearchGraphFilters, SearchGraphPayloadDTO } from './models/search-graphs';

@Injectable({
  providedIn: 'root',
})
export class GraphAdapter implements AdapterInterface<Graph[]> {
  fromApi(response: BaseResponse<{ graphs: GraphData[] }>): Graph[] {
    const graphs: Graph[] = [];
    if (response.data && response.data.graphs) {
      response.data.graphs.forEach((graph: GraphData) => {
        graphs.push(
          new Graph(
            graph.id,
            graph.name,
            graph.description,
            graph.url,
            graph.type,
            graph.restriction_type,
            graph.auto_refresh,
            graph.external_id,
          ),
        );
      });
    }
    return graphs;
  }

  toApi(filters: Partial<SearchGraphFilters>): SearchGraphPayloadDTO {
    const body: SearchGraphPayloadDTO = {};

    if (filters.planIds !== undefined) {
      body.plan_ids = filters.planIds;
    }

    if (filters.partnerIds !== undefined) {
      body.partner_ids = filters.partnerIds;
    }

    if (filters.planId !== undefined) {
      body.plan_id = filters.planId;
    }

    if (filters.groupName !== undefined) {
      body.group_name = filters.groupName;
    }

    if (filters.currency !== undefined) {
      body.currency = filters.currency;
    }

    if (filters.channelId !== undefined) {
      body.channel_id = filters.channelId;
    }

    if (filters.resellerId !== undefined) {
      body.reseller_id = filters.resellerId;
    }

    return body;
  }
}
