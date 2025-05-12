import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { shareReplay } from 'rxjs/internal/operators/shareReplay';
import { catchError } from 'rxjs/internal/operators/catchError';
import { of } from 'rxjs/internal/observable/of';

import { environment } from '../../environments/environment'

import { CampaignDb } from '../models/campaign/campaing.model';
import { CampaignListDb } from '../models/campaign/campaignList.model';
import { ProjectRead } from '../view-models/project/projectRead.model';
import { CampaignRead } from '../view-models/campaign/campaignRead.model';


@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private readonly baseUrl = `${environment.digitalCommunication.url}${'database/'}`;

  constructor(private httpClient: HttpClient) {}

  createCampaign(request: CampaignDb) {
    return this.httpClient.post<CampaignDb>(
      `${this.baseUrl}postCampaignDb`,
      request,
      {
        headers: {
          AuthorizationToken: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
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
          AuthorizationToken: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
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
          AuthorizationToken: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
        },
      }
    );
  }

  getCampaigns() {
    return this.httpClient
      .get<CampaignRead[]>(`${this.baseUrl}getCampaignsDb`, {
        responseType: 'json',
        headers: {
          AuthorizationToken: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
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
            AuthorizationToken: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
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
        AuthorizationToken: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
      },
    });
  }

  getProjects() {
    return this.httpClient
      .get<ProjectRead[]>(`${this.baseUrl}getProjectsDb`, {
        responseType: 'json',
        headers: {
          AuthorizationToken: '0194f1f6-c99a-7c68-a713-4ca978bc5627'
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
          AuthorizationToken: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
        },
      }
    );
  }

  getCampaignsNoSql() {
    return this.httpClient
      .get<CampaignRead[]>(`${this.baseUrl}getCampaigns`, {
        responseType: 'json',
        headers: {
          AuthorizationToken: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
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
        AuthorizationToken: '0194f1f6-c99a-7c68-a713-4ca978bc5627',
      },
    });
  }
}
