import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, of, shareReplay } from 'rxjs';

import { environment } from '../../environments/environment'

import { CampaignIterable } from '../view-models/campaign/campaignIterable.model';
import { CampaignListIterable } from '../view-models/campaign/campaignListIterable.model';
import { TemplateIterable } from '../view-models/template/templateIterable.model';
import { SubscriberIterable } from '../view-models/subscriber/subscriberIterable.model';
import { StaticListRequest } from '../view-models/static-list/request/staticListRequest.model';
import { StaticListResponse } from '../view-models/static-list/response/staticListResponse.model';
import { SubscriberListRequest } from '../view-models/subscriber/request/subscriberListRequest.model';
import { SubscriberListResponse } from '../view-models/subscriber/response/subscriberListResponse.model';
import { CreateCampaignRequest } from '../view-models/campaign/request/createCampaignRequest.model';
import { CreateCampaginResponse } from '../view-models/campaign/response/createCampaginResponse.model';
import { ArchiveCampaignRequest } from '../view-models/archive/request/archiveCampaignRequest.model';


@Injectable({
  providedIn: 'root'
})
export class IterableService {
  private readonly baseUrl = `${environment.digitalCommunication.url}${'iterable/'}`;
  private readonly authorizationToken = environment.digitalCommunication.token;

  constructor(private httpClient: HttpClient) {}

  getCampaignByType() {
    return this.httpClient
      .get<CampaignIterable[]>(`${this.baseUrl}getCampaignByType`, {
        responseType: 'json',
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      })
      .pipe(
        shareReplay(),
        catchError((error) => {
          console.error('An error ocurred', error);
          return of([]);
        })
      );
  }

  getListByType() {
    return this.httpClient
      .get<CampaignListIterable[]>(`${this.baseUrl}getListByType`, {
        responseType: 'json',
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      })
      .pipe(
        shareReplay(),
        catchError((error) => {
          console.error('An error ocurred', error);
          return of([]);
        })
      );
  }

  getTemplateById(id: number) {
    return this.httpClient
      .get<TemplateIterable>(`${this.baseUrl}getTemplateById?id=${id}`, {
        responseType: 'json',
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      })
      .pipe(
        shareReplay(),
        catchError((error) => {
          console.error('An error ocurred', error);
          return of({} as TemplateIterable);
        })
      );
  }

  getListSize(id: number) {
    return this.httpClient.get<number>(`${this.baseUrl}getListSize?id=${id}`, {
      responseType: 'json',
      headers: {
        AuthorizationToken: this.authorizationToken,
      },
    })
    .pipe(
      shareReplay(),
      catchError((error) => {
        console.error('An error ocurred', error);
        return of(0);
      })
    );
  }

  getListUsers(id: number, chunk: number) {
    return this.httpClient.get<SubscriberIterable[][]>(
      `${this.baseUrl}getListUsers?id=${id}&chunk=${chunk}&preferUserId=true`,
      {
        responseType: 'json',
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      }
    )
    .pipe(
      shareReplay(),
      catchError((error) => {
        console.error('An error ocurred', error);
        return of([]);
      })
    );
  }

  createStaticList(request: StaticListRequest) {
    return this.httpClient.post<StaticListResponse>(
      `${this.baseUrl}createStaticList`,
      request,
      {
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      }
    );
  }

  createSubscriberList(request: SubscriberListRequest) {
    return this.httpClient.post<SubscriberListResponse>(
      `${this.baseUrl}createSubscriberList`,
      request,
      {
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      }
    );
  }

  createCampaign(request: CreateCampaignRequest) {
    return this.httpClient.post<CreateCampaginResponse>(
      `${this.baseUrl}createCampagin`,
      request,
      {
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      }
    );
  }

  archiveCampaign(request: ArchiveCampaignRequest) {
    return this.httpClient.post<boolean>(
      `${this.baseUrl}archiveCampaign`,
      request,
      {
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      }
    );
  }

  deleteList(id: number) {
    return this.httpClient.delete(
      `${this.baseUrl}deleteList?id=${id}`,
      {
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      }
    );
  }
}
