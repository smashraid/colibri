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

import { environment } from '../../environments/environment';

import { AppStore } from '../app.store';

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
import { BlastRequest } from '../view-models/campaign/request/blastRequest.model';
import { BlastListRequest } from '../view-models/campaign/request/blastListRequest.model';
import { BlastListSubscriberRequest } from '../view-models/campaign/request/blastListSubscriberRequest.model';
import { BlastCampaignRequest } from '../view-models/campaign/request/blastCampaignRequest.model';
import { BlastListSubscriberResponse } from '../view-models/campaign/response/blastListSubscriberResponse.model';
import { BlastCampaignResponse } from '../view-models/campaign/response/blastCampaignResponse.model';

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
      .get<CampaignIterable[]>(`${this.baseUrl}getCampaignByType`, {
        responseType: 'json',
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
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
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
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
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
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
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
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
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            AuthorizationToken: this.authorizationToken,
            'X-Project': this.store.projectId(),
          }),
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
    return this.httpClient
      .post<StaticListResponse>(`${this.baseUrl}createStaticList`, request, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
      })
      .pipe(
        //retry(this.retries),
        catchError(this.handleError)
      );
  }

  createSubscriberList(request: SubscriberListRequest) {
    return this.httpClient
      .post<SubscriberListResponse>(
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
      .pipe(
        //retry(this.retries),
        catchError(this.handleError)
      );
  }

  createCampaign(request: CreateCampaignRequest) {
    return this.httpClient
      .post<CreateCampaginResponse>(`${this.baseUrl}createCampagin`, request, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
      })
      .pipe(
        //retry(this.retries),
        catchError(this.handleError)
      );
  }

  createBlast(request: BlastRequest) {
    return this.httpClient
      .post<CampaignListDb>(`${this.baseUrl}createBlast`, request, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
      })
      .pipe(
        //retry(this.retries),
        catchError(this.handleError)
      );
  }

  createBlastList(request: BlastListRequest) {
    return this.httpClient
      .post<number[]>(`${this.baseUrl}createBlastList`, request, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
      })
      .pipe(
        //retry(this.retries),
        catchError(this.handleError)
      );
  }

  createBlastListSubscribers(request: BlastListSubscriberRequest) {
    return this.httpClient
      .post<BlastListSubscriberResponse[]>(
        `${this.baseUrl}createBlastListSubscribers`,
        request,
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            AuthorizationToken: this.authorizationToken,
            'X-Project': this.store.projectId(),
          }),
        }
      )
      .pipe(
        //retry(this.retries),
        catchError(this.handleError)
      );
  }

  createBlastCampaign(request: BlastCampaignRequest) {
    return this.httpClient
      .post<BlastCampaignResponse[]>(
        `${this.baseUrl}createBlastCampaign`,
        request,
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            AuthorizationToken: this.authorizationToken,
            'X-Project': this.store.projectId(),
          }),
        }
      )
      .pipe(
        //retry(this.retries),
        catchError(this.handleError)
      );
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
      .pipe(
        retry({ count: this.retries, delay: this.delay }),
        catchError(this.handleError)
      );
  }

  deleteList(id: number) {
    return this.httpClient
      .delete(`${this.baseUrl}deleteList?id=${id}`, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          AuthorizationToken: this.authorizationToken,
          'X-Project': this.store.projectId(),
        }),
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
    return throwError(() => 'Something bad happened; please try again later.');
  }
}
