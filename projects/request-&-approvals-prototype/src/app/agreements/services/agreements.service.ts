import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { BaseErrorResponse, BaseResponseDTO } from '../../shared/models/base-response';
import type { AcceptancePolicy } from '../models/acceptance-policy.model';
import type { AgreementListFilters } from '../models/agreement-list-filters.model';
import type {
  CreateAgreementPayload,
  PublishVersionPayload,
  SavePolicyPayload,
  UpdateAgreementPayload,
} from '../models/agreement-payloads.model';
import type { AgreementVersion } from '../models/agreement-version.model';
import type { Agreement, AgreementListResult } from '../models/agreement.model';
import type { PartnerRef } from '../models/partner-ref.model';
import { AgreementsAdapter } from './adapters/agreements.adapter';
import type { AgreementPolicyDto } from './dtos/agreement-policy.dto';
import type { AgreementDetailResourceDto, AgreementResourceDto, AgreementResourceListDto } from './dtos/agreement-resource.dto';
import type { AgreementVersionDetailDto, AgreementVersionDto, AgreementVersionListResultDto } from './dtos/agreement-version.dto';

const AGREEMENTS_PAGE_LIMIT = 100;

const VERSIONS_PAGE_LIMIT = 100;

const MAX_PAGES = 50;

const WRITE_TIMEOUT_MS = 30000;

@Injectable({ providedIn: 'root' })
export class AgreementsService {
  readonly #adapter = inject(AgreementsAdapter);
  readonly #http = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);

  archive(id: string): Observable<Agreement> {
    return this.#withPartner(base =>
      this.#http
        .post<BaseResponseDTO<AgreementResourceDto>>(`${base}/agreements/${id}/archive`, {}, this.#idempotent())
        .pipe(map(res => this.#adapter.fromApi(this.#unwrap(res)))),
    );
  }

  create(payload: CreateAgreementPayload): Observable<Agreement> {
    return this.#withPartner(base =>
      this.#http
        .post<BaseResponseDTO<AgreementResourceDto>>(`${base}/agreements`, this.#adapter.toCreateDto(payload), this.#idempotent())
        .pipe(map(res => this.#adapter.fromApi(this.#unwrap(res)))),
    );
  }

  currentPartner(): Observable<PartnerRef> {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      return throwError(() => new Error('No partner in context'));
    }
    return of({ id: String(partner.id), name: partner.name });
  }

  getById(id: string): Observable<Agreement> {
    return this.#withPartner(base =>
      this.#http
        .get<BaseResponseDTO<AgreementDetailResourceDto>>(`${base}/agreements/${id}`)
        .pipe(map(res => this.#adapter.fromDetailApi(this.#unwrap(res)))),
    );
  }

  getVersion(versionId: string): Observable<AgreementVersion> {
    return this.#withPartner(base =>
      this.#http
        .get<BaseResponseDTO<AgreementVersionDetailDto>>(`${base}/agreement-versions/${versionId}`)
        .pipe(map(res => this.#adapter.fromVersionDetailApi(this.#unwrap(res)))),
    );
  }

  list(filters: AgreementListFilters = {}): Observable<AgreementListResult> {
    return this.#withPartner(base =>
      this.#paginate<AgreementResourceListDto, AgreementResourceDto>(offset => this.#listPage(base, offset)).pipe(
        map(dtos => this.#adaptListRows(dtos, filters)),
      ),
    );
  }

  listVersions(agreementId: string): Observable<AgreementVersion[]> {
    return this.#withPartner(base =>
      this.#paginate<AgreementVersionListResultDto, AgreementVersionDto>(offset =>
        this.#http
          .get<
            BaseResponseDTO<AgreementVersionListResultDto>
          >(`${base}/agreements/${agreementId}/versions`, { params: new HttpParams().set('limit', VERSIONS_PAGE_LIMIT).set('offset', offset) })
          .pipe(map(res => this.#unwrap(res))),
      ).pipe(map(items => items.map(dto => this.#adapter.fromVersionApi(dto, null)))),
    );
  }

  publishVersion(agreementId: string, payload: PublishVersionPayload): Observable<AgreementVersion> {
    return this.#withPartner(base =>
      this.#http
        .post<
          BaseResponseDTO<AgreementVersionDto>
        >(`${base}/agreements/${agreementId}/versions`, this.#adapter.toVersionDto(payload), this.#idempotent())
        .pipe(map(res => this.#adapter.fromVersionApi(this.#unwrap(res), null))),
    );
  }

  restore(id: string): Observable<Agreement> {
    return this.#withPartner(base =>
      this.#http
        .post<BaseResponseDTO<AgreementResourceDto>>(`${base}/agreements/${id}/restore`, {}, this.#idempotent())
        .pipe(map(res => this.#adapter.fromApi(this.#unwrap(res)))),
    );
  }

  savePolicy(agreementId: string, payload: SavePolicyPayload): Observable<AcceptancePolicy> {
    return this.#withPartner(base =>
      this.#http
        .put<
          BaseResponseDTO<AgreementPolicyDto>
        >(`${base}/agreements/${agreementId}/policy`, this.#adapter.toPolicyDto(payload), this.#idempotent())
        .pipe(map(res => this.#adapter.fromPolicyApi(this.#unwrap(res)))),
    );
  }

  update(id: string, payload: UpdateAgreementPayload): Observable<Agreement> {
    return this.#withPartner(base =>
      this.#http
        .put<BaseResponseDTO<AgreementResourceDto>>(`${base}/agreements/${id}`, this.#adapter.toDraftUpdateDto(payload), this.#idempotent())
        .pipe(map(res => this.#adapter.fromApi(this.#unwrap(res)))),
    );
  }

  #adaptListRows(dtos: AgreementResourceDto[], filters: AgreementListFilters): AgreementListResult {
    const adapted = dtos.map(dto => {
      try {
        return this.#adapter.fromApi(dto);
      } catch {
        return null;
      }
    });
    const unreadable = adapted.filter(agreement => agreement === null).length;
    const items = adapted.filter((agreement): agreement is Agreement => agreement !== null && this.#matchesFilters(agreement, filters));
    return { items, unreadable };
  }

  #idempotent(): { headers: Record<string, string> } {
    // The timeout header opts into TimeoutInterceptor, so a hung write settles instead of locking the UI forever.
    return { headers: { 'Idempotency-Key': crypto.randomUUID(), timeout: `${WRITE_TIMEOUT_MS}` } };
  }

  #listPage(base: string, offset: number): Observable<AgreementResourceListDto> {
    const params = new HttpParams().set('limit', AGREEMENTS_PAGE_LIMIT).set('offset', offset);
    return this.#http.get<BaseResponseDTO<AgreementResourceListDto>>(`${base}/agreements`, { params }).pipe(map(res => this.#unwrap(res)));
  }

  #matchesFilters(agreement: Agreement, filters: AgreementListFilters): boolean {
    if (filters.agreementType && agreement.agreementType !== filters.agreementType) {
      return false;
    }
    return !(filters.status && agreement.status !== filters.status);
  }

  #paginate<P extends { has_more: boolean; items: I[]; offset: number }, I>(fetchPage: (offset: number) => Observable<P>): Observable<I[]> {
    return fetchPage(0).pipe(
      expand((page, index) => {
        const items = page.items ?? [];
        if (!page.has_more || items.length === 0 || index + 1 >= MAX_PAGES) {
          return EMPTY;
        }
        return fetchPage(page.offset + items.length);
      }),
      reduce<P, I[]>((all, page) => [...all, ...(page.items ?? [])], []),
    );
  }

  #unwrap<T>(res: BaseResponseDTO<T>): T {
    if (res.data == null) {
      const error: BaseErrorResponse | null | undefined = res.error;
      throw new Error(error?.userError ?? error?.message ?? 'Empty data envelope in agreements response');
    }
    return res.data;
  }

  #withPartner<T>(request: (baseUrl: string) => Observable<T>): Observable<T> {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId == null) {
      return throwError(() => new Error('No partner in context'));
    }
    return request(`${environment.apiGWBaseUrl}/1.0/partners/${partnerId}`);
  }
}
