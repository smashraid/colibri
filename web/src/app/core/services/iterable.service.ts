import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  Observable,
  of,
  retry,
  shareReplay,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppStore } from '../../app.store';
import {
  CampaignResponse,
  CreateCampaignResponse,
} from '../models/api/response/campaign';
import { CampaignListResponse } from '../models/api/response/campaign-list';
import { TemplateDetailResponse } from '../models/api/response/template';
import {
  CreateSubscribersResponse,
  SubscriberResponse,
} from '../models/api/response/subscriber';
import { CreateStaticListRequest } from '../models/api/requests/static-list';
import { CreateSubscribersRequest } from '../models/api/requests/subscriber';
import {
  ArchiveCampaignRequest,
  CreateCampaignRequest,
} from '../models/api/requests/campaign';
import {
  CreateStaticListResponse,
  DeleteStaticListResponse,
} from '../models/api/response/static-list';

@Injectable({
  providedIn: 'root',
})
export class IterableService {
  private readonly baseUrl = `${
    environment.digitalCommunication.url
  }${'iterable/'}`;
  private readonly authorizationToken = environment.digitalCommunication.token;
  private readonly retries = environment.digitalCommunication.retries;
  private readonly delay = environment.digitalCommunication.delay;

  readonly store = inject(AppStore);

  constructor(private httpClient: HttpClient) {}

  getCampaignByType() {
    return this.httpClient
      .get<CampaignResponse[]>(`${this.baseUrl}getCampaignByType`, {
        responseType: 'json',
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
      })
      .pipe(shareReplay());
  }

  getListByType(filter: string) {
    return this.httpClient
      .get<CampaignListResponse[]>(
        `${this.baseUrl}getListByType?filter=${filter}`,
        {
          responseType: 'json',
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            AuthorizationToken: this.authorizationToken,
            'X-Project': this.store.projectId(),
          }),
        }
      )
      .pipe(shareReplay());
  }

  getTemplateById(id: number) {
    return this.httpClient
      .get<TemplateDetailResponse>(`${this.baseUrl}getTemplateById?id=${id}`, {
        responseType: 'json',
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
      })
      .pipe(shareReplay());
  }

  getListSize(id: number) {
    return this.httpClient
      .get<number>(`${this.baseUrl}getListSize?id=${id}`, {
        responseType: 'json',
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
      })
      .pipe(shareReplay());
  }

  getListUsers(id: number, chunk: number) {
    return this.httpClient
      .get<SubscriberResponse[][]>(
        `${this.baseUrl}getListUsers?id=${id}&chunk=${chunk}&preferUserId=true`,
        {
          responseType: 'json',
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            AuthorizationToken: this.authorizationToken,
            'X-Project': this.store.projectId(),
          }),
        }
      )
      .pipe(shareReplay());
  }

  createStaticList(request: CreateStaticListRequest) {
    return this.httpClient
      .post<CreateStaticListResponse>(
        `${this.baseUrl}createStaticList`,
        request,
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            AuthorizationToken: this.authorizationToken,
            'X-Project': this.store.projectId(),
          }),
        }
      )
      .pipe
      //retry(this.retries),
      ();
  }

  createSubscriberList(request: CreateSubscribersRequest) {
    return this.httpClient
      .post<CreateSubscribersResponse>(
        `${this.baseUrl}createSubscriberList`,
        request,
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            AuthorizationToken: this.authorizationToken,
            'X-Project': this.store.projectId(),
          }),
        }
      )
      .pipe
      //retry(this.retries),
      ();
  }

  createCampaign(request: CreateCampaignRequest) {
    return this.httpClient
      .post<CreateCampaignResponse>(`${this.baseUrl}createCampaign`, request, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
      })
      .pipe
      //retry(this.retries),
      ();
  }

  archiveCampaign(request: ArchiveCampaignRequest) {
    return this.httpClient
      .post<boolean>(`${this.baseUrl}archiveCampaign`, request, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
      })
      .pipe(retry({ count: this.retries, delay: this.delay }));
  }

  deleteList(id: bigint) {
    return this.httpClient
      .delete<DeleteStaticListResponse>(`${this.baseUrl}deleteList?id=${id}`, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
      })
      .pipe(retry({ count: this.retries, delay: this.delay }));
  }
}
