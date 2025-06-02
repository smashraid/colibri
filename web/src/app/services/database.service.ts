import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { shareReplay } from 'rxjs/internal/operators/shareReplay';
import { catchError } from 'rxjs/internal/operators/catchError';
import { of } from 'rxjs/internal/observable/of';

import { environment } from '../../environments/environment';

import { CampaignDb } from '../models/campaign/campaing.model';
import { CampaignListDb } from '../models/campaign/campaignList.model';
import { ProjectRead } from '../view-models/project/projectRead.model';
import { CampaignRead } from '../view-models/campaign/campaignRead.model';
import { throwError } from 'rxjs/internal/observable/throwError';
import { PagedMetadata } from '../view-models/pagination.model';
import { ArchiveReadViewModel } from '../view-models/archive/archiveRead.model';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private readonly baseUrl = `${
    environment.digitalCommunication.url
  }${'database/'}`;
  private readonly authorizationToken = environment.digitalCommunication.token;

  constructor(private httpClient: HttpClient) {}

  createCampaign(request: CampaignDb) {
    return this.httpClient.post<CampaignDb>(
      `${this.baseUrl}postCampaignDb`,
      request,
      {
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      }
    );
  }

  createCampaignList(request: CampaignListDb, campaignId: number) {
    return this.httpClient.post<CampaignListDb>(
      `${this.baseUrl}postListDb?campaignId=${campaignId}`,
      request,
      {
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      }
    );
  }

  createCampaignLists(request: CampaignListDb[], campaignId: number) {
    return this.httpClient.post(
      `${this.baseUrl}postListsDb?campaignId=${campaignId}`,
      request,
      {
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      }
    );
  }

  getCampaigns() {
    return this.httpClient
      .get<CampaignRead[]>(`${this.baseUrl}getCampaignsDb`, {
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

  getCampaignDb(id: number) {
    return this.httpClient
      .get<CampaignRead>(`${this.baseUrl}getCampaignDb/${id}`, {
        responseType: 'json',
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      })
      .pipe(
        shareReplay(),
        catchError((error) => {
          console.error('An error ocurred', error);
          return of({} as CampaignRead);
        })
      );
  }

  getCampaignsByProject(id: number, metadata: PagedMetadata) {
    return this.httpClient
      .get<CampaignRead[]>(
        `${this.baseUrl}getCampaignsByProject/${id}?pageNumber=${metadata.currentPage}&pageSize=${metadata.pageSize}`,
        {
          responseType: 'json',
          headers: {
            AuthorizationToken: this.authorizationToken,
          },
          observe: 'response',
        }
      )
      .pipe(
        shareReplay(),
        catchError((error) => {
          console.error('An error ocurred', error);
          return throwError(
            () =>
              new Error(
                'An error ocurrend Database Service - getCampaignsByProject'
              )
          );
        })
      );
  }

  getCampaignLists(campaignId: number, metadata: PagedMetadata) {
    return this.httpClient
      .get<CampaignListDb[]>(
        `${this.baseUrl}getListsDb?campaignId=${campaignId}&pageNumber=${
          metadata.currentPage + 1
        }&pageSize=${metadata.pageSize}`,
        {
          responseType: 'json',
          headers: {
            AuthorizationToken: this.authorizationToken,
          },
          observe: 'response',
        }
      )
      .pipe(
        shareReplay(),
        catchError((error) => {
          console.error('An error ocurred', error);
          return throwError(
            () =>
              new Error('An error ocurrend Database Service - getCampaignLists')
          );
        })
      );
  }

  getArchiveDb(id: number) {
    return this.httpClient
      .get<ArchiveReadViewModel>(`${this.baseUrl}getArchiveDb/${id}`, {
        responseType: 'json',
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      })
      .pipe(
        shareReplay(),
        catchError((error) => {
          console.error('An error ocurred', error);
          return of({ campaigns: [], lists: [] } as ArchiveReadViewModel);
        })
      );
  }

  getTagsDb() {
    return this.httpClient
      .get<string[]>(`${this.baseUrl}getTagsDb`, {
        responseType: 'json',
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      })
      .pipe(
        shareReplay(),
        catchError((error) => {
          console.error('An error ocurred', error);
          return of([] as string[]);
        })
      );
  }

  deleteCampaign(id: number) {
    return this.httpClient.delete(`${this.baseUrl}deleteCampaignDb/${id}`, {
      headers: {
        AuthorizationToken: this.authorizationToken,
      },
    });
  }

  getProjects() {
    return this.httpClient
      .get<ProjectRead[]>(`${this.baseUrl}getProjectsDb`, {
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

  createCampaignNoSql(request: CampaignDb) {
    return this.httpClient.post<CampaignDb>(
      `${this.baseUrl}postCampaign`,
      request,
      {
        headers: {
          AuthorizationToken: this.authorizationToken,
        },
      }
    );
  }

  getCampaignsNoSql() {
    return this.httpClient
      .get<CampaignRead[]>(`${this.baseUrl}getCampaigns`, {
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

  deleteCampaignNoSql(id: number) {
    return this.httpClient.delete(`${this.baseUrl}deleteCampaign/${id}`, {
      headers: {
        AuthorizationToken: this.authorizationToken,
      },
    });
  }
}
