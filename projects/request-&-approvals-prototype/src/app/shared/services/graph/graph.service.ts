import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { GraphDataFreshness, GraphDataFreshnessResponse } from '../../models/graph/graph.data-freshness';
import { Graph, GraphData } from '../../models/graph/graph.model';
import { Partner } from '../../models/partner/partner.model';
import { GraphAdapter } from './graph.adapter';
import { SearchGraphFilters, SearchGraphPayloadDTO, SearchGraphQueryParams } from './models/search-graphs';

@Injectable({
  providedIn: 'root',
})
export class GraphService {
  #graphAdapter = inject(GraphAdapter);
  #http = inject(HttpClient);
  #partnerService = inject(PartnerService);

  getBoxOfficeGraph(): Observable<Graph[]> {
    const partner: Partner | null = this.#partnerService.getPartner();
    const path: string = this.#getBoxOfficeGraphUrl(partner!.id);
    return this.#http
      .get<BaseResponse<{ graphs: GraphData[] }>>(path)
      .pipe(map((data: BaseResponse<{ graphs: GraphData[] }>) => this.#graphAdapter.fromApi(data)));
  }

  searchOrganizationGraph(filters: Partial<SearchGraphFilters>): Observable<Graph[]> {
    const partner: Partner | null = this.#partnerService.getPartner();
    if (!partner) {
      throw new Error('Partner ID was not found');
    }

    if (partner?.type !== undefined && this.#partnerService.isReseller(partner.type)) {
      return this.#searchResellerGraph(partner.id, filters);
    } else {
      return this.#searchPartnerGraph(partner.id, filters);
    }
  }

  getDataFreshness(planId: number, partnerId: number, externalId: number): Observable<GraphDataFreshness> {
    const path: string = this.#getGraphDataFreshnessUrl(planId, partnerId, externalId);

    return this.#http
      .get<GraphDataFreshnessResponse>(path)
      .pipe(map((data: GraphDataFreshnessResponse) => ({ lastData: data.last_data ?? null, lastRefresh: data.last_refresh ?? null })));
  }

  #getBoxOfficeGraphUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/box-office-graphs`;
  }

  #getGraphParams(queryParams: Partial<SearchGraphQueryParams>): HttpParams {
    let params = new HttpParams();
    if (queryParams.planId) {
      params = params.append('plan_id', queryParams.planId);
    }
    if (queryParams.groupName) {
      params = params.append('group_name', queryParams.groupName);
    }
    if (queryParams.planIds) {
      params = params.append('plan_ids', queryParams.planIds.toString());
    }
    if (queryParams.currency) {
      params = params.append('currency', queryParams.currency);
    }
    if (queryParams.channelId) {
      params = params.append('channel_id', queryParams.channelId.toString());
    }
    if (queryParams.resellerId) {
      params = params.append('reseller_id', queryParams.resellerId.toString());
    }
    if (queryParams.organizationOwnerId) {
      params = params.append('partner_id', queryParams.organizationOwnerId.toString());
    }
    if (queryParams.partnerIds) {
      params = params.append('partner_ids', queryParams.partnerIds.toString());
    }

    return params;
  }

  #getGraphUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/graphs`;
  }

  #getResellerGraphUrl(resellerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/resellers/${resellerId}/graphs`;
  }

  #getGraphDataFreshnessUrl(planId: number, partnerId: number, externalId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/data-freshness?plan_id=${planId}&dashboard_id=${externalId}`;
  }

  #searchPartnerGraph(partnerId: number, filters: Partial<SearchGraphFilters>): Observable<Graph[]> {
    const path: string = this.#getGraphUrl(partnerId);
    const body: SearchGraphPayloadDTO = this.#graphAdapter.toApi(filters);

    return this.#http
      .post<BaseResponse<{ graphs: GraphData[] }>>(path, body)
      .pipe(map((data: BaseResponse<{ graphs: GraphData[] }>) => this.#graphAdapter.fromApi(data)));
  }

  #searchResellerGraph(partnerId: number, queryParams: Partial<SearchGraphFilters>): Observable<Graph[]> {
    const path: string = this.#getResellerGraphUrl(partnerId);
    const params: HttpParams = this.#getGraphParams(queryParams);

    return this.#http
      .get<BaseResponse<{ graphs: GraphData[] }>>(path, { params })
      .pipe(map((data: BaseResponse<{ graphs: GraphData[] }>) => this.#graphAdapter.fromApi(data)));
  }
}
