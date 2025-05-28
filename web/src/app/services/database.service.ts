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

  getCampaignsByProject(id: number) {
    return this.httpClient
      .get<CampaignRead[]>(`${this.baseUrl}getCampaignsByProject/${id}`, {
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

  getCampaignLists(campaignId: number) {
    return this.httpClient
      .get<CampaignListDb[]>(
        `${this.baseUrl}getListsDb?campaignId=${campaignId}`,
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
