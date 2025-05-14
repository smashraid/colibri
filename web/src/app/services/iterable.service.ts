import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  catchError,
  concatMap,
  delay,
  map,
  mergeMap,
  Observable,
  of,
  retry,
  shareReplay,
  switchMap,
  throwError,
  withLatestFrom,
} from 'rxjs';

import { environment } from '../../environments/environment';

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
import { CampaignListDb } from '../models/campaign/campaignList.model';

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
    return this.httpClient
      .get<number>(`${this.baseUrl}getListSize?id=${id}`, {
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
    return this.httpClient
      .get<SubscriberIterable[][]>(
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
    return of(null).pipe(
      delay(this.delay),
      switchMap(() =>
        this.httpClient
          .post<StaticListResponse>(
            `${this.baseUrl}createStaticList`,
            request,
            {
              headers: {
                AuthorizationToken: this.authorizationToken,
              },
            }
          )
          .pipe(retry(this.retries), catchError(this.handleError))
      )
    );
  }

  createSubscriberList(request: SubscriberListRequest) {
    return of(null).pipe(
      delay(this.delay),
      switchMap(() =>
        this.httpClient
          .post<SubscriberListResponse>(
            `${this.baseUrl}createSubscriberList`,
            request,
            {
              headers: {
                AuthorizationToken: this.authorizationToken,
              },
            }
          )
          .pipe(retry(this.retries), catchError(this.handleError))
      )
    );
  }

  createCampaign(request: CreateCampaignRequest) {
    return of(null).pipe(
      delay(this.delay),
      switchMap(() =>
        this.httpClient
          .post<CreateCampaginResponse>(
            `${this.baseUrl}createCampagin`,
            request,
            {
              headers: {
                AuthorizationToken: this.authorizationToken,
              },
            }
          )
          .pipe(retry(this.retries), catchError(this.handleError))
      )
    );
  }

  createBlast(
    subscribers: SubscriberIterable[],
    order: number,
    data: {
      campaignName: string;
      templateId: number;
      listId: number;
      supressionList: number | null | undefined;
      batchSize: number;
      sendAt: string;
      interval: number;
    }
  ): Observable<CampaignListDb> {
    return this.createStaticList({
      name: `Blast List ${order}`,
      description: 'Blast List',
    }).pipe(
      concatMap((staticListResponse) =>
        this.createSubscriberList({
          listId: staticListResponse.listId,
          subscribers,
          updateExistingUsersOnly: true,
        }).pipe(map((subscriberListResponse) => staticListResponse.listId))
      ),
      concatMap((listId) =>
        this.createCampaign({
          name: data.campaignName,
          dataFields: null,
          defaultTimeZone: 'America/New_York',
          listIds: [listId],
          sendAt: data.sendAt,
          sendMode: 'RecipientTimeZone',
          startTimeZone: 'America/New_York',
          suppressionListIds: null,
          templateId: data.templateId,
        }).pipe(
          mergeMap((createCampaignResponse) =>
            of({
              id: 0,
              name: `Blast List`,
              iterableCampaignId: createCampaignResponse.campaignId,
              iterableListId: data.listId,
              iterableTemplateId: data.templateId,
              sendAt: data.sendAt,
              startTimeZone: 'America/New_York',
              defaultTimeZone: 'America/New_York',
              emails: subscribers.map((s) => s.email),
              order: order,
            } as  CampaignListDb)
          )
        )
      )
    );
  }

  archiveCampaign(request: ArchiveCampaignRequest) {
    return this.httpClient
      .post<boolean>(`${this.baseUrl}archiveCampaign`, request, {
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      })
      .pipe(
        retry({ count: this.retries, delay: this.delay }),
        catchError(this.handleError)
      );
  }

  deleteList(id: number) {
    return this.httpClient
      .delete(`${this.baseUrl}deleteList?id=${id}`, {
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      })
      .pipe(
        retry({ count: this.retries, delay: this.delay }),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(
        `Backend returned code ${error.status}, ` + `body was: ${error.error}`
      );
    }
    // Return an observable with a user-facing error message.
    return throwError('Something bad happened; please try again later.');
  }
}
